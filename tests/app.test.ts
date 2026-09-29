import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { app, type Env } from "../server/app";
import { Store, type Database, type Prepared } from "../server/store";
import { makePerson } from "../server/domain";
import type { DateSession, Job, Person, Evidence } from "../src/types";

const session = "recovery-test-session";
function database() {
  const sqlite = new DatabaseSync(":memory:");
  const directory = new URL("../drizzle/", import.meta.url);
  for (const name of readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
  let lockAttempts = 0;
  class Statement implements Prepared {
    values: any[] = [];
    constructor(public sql: string) {}
    bind(...values: any[]) {
      this.values = values;
      return this;
    }
    async first<T>() {
      return (sqlite.prepare(this.sql).get(...this.values) || null) as T | null;
    }
    async all<T>() {
      return { results: sqlite.prepare(this.sql).all(...this.values) as T[] };
    }
    async run() {
      if (this.sql.startsWith("INSERT INTO locks")) lockAttempts++;
      return {
        meta: {
          changes: Number(sqlite.prepare(this.sql).run(...this.values).changes),
        },
      };
    }
  }
  const DB: Database = {
    prepare: (sql) => new Statement(sql),
    batch: async (statements) =>
      Promise.all(statements.map((statement) => statement.run())),
  };
  return {
    DB,
    store: new Store(DB),
    close: () => sqlite.close(),
    lockAttempts: () => lockAttempts,
  };
}
function person(id: string): Person {
  const evidence: Evidence[] = [
    {
      id: id + "-li",
      platform: "linkedin",
      url: "https://www.linkedin.com/in/alex-sample/",
      text: "Alex Sample is a photographer and writer.",
      kind: "about",
      retrievedAt: "",
    },
    {
      id: id + "-ig",
      platform: "instagram",
      url: "https://www.instagram.com/alexsample/",
      text: "Alex Sample. Photography, nature and weekend walks.",
      kind: "bio",
      retrievedAt: "",
    },
  ];
  return makePerson({
    id,
    name: "Alex Sample",
    linkedinUrl: evidence[0].url,
    instagramUrl: evidence[1].url,
    evidence,
    publicVerified: true,
    identityVerified: true,
    identityNote: "Fixture",
    demo: true,
  });
}
async function seedDate(store: Store, id = "date-test") {
  const a = person("alex"),
    b = person("blair");
  await store.put("people", a.id, a);
  await store.put("people", b.id, b);
  const date: DateSession & { owner: string } = {
    id,
    aId: a.id,
    bId: b.id,
    scenario: "First coffee",
    status: "running",
    messages: [],
    assessments: [],
    stage: 0,
    engine: "groq",
    createdAt: "",
    updatedAt: "",
    demo: false,
    version: 0,
    owner: session,
  };
  await store.put("dates", id, date);
  return date;
}
const advance = (env: Env, kind: "jobs" | "dates", id: string) =>
  app.request(
    `/api/${kind}/${id}/advance`,
    { method: "POST", headers: { Cookie: `twofold_session=${session}` } },
    env,
  );
const modelResponse = (value: unknown) =>
  new Response(
    JSON.stringify({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(value) } },
      ],
    }),
  );

test("a live date waits on model limits without extra calls, then resumes its saved turn", async (t) => {
  const db = database();
  t.after(db.close);
  await seedDate(db.store);
  const env: Env = { DB: db.DB, GROQ_API_KEY: "test-key" };
  let now = Date.now(),
    calls = 0;
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return calls === 1
      ? new Response("{}", { status: 429, headers: { "retry-after": "1" } })
      : modelResponse({
          text: "In this fictional scene I choose the nature photograph and ask which detail stands out.",
          evidenceIds: ["alex-ig"],
          proposal: "gallery",
        });
  });
  let response = await advance(env, "dates", "date-test");
  assert.equal(response.status, 202);
  let value = (await response.json()) as any;
  assert.equal(value.status, "running");
  assert.equal(Date.parse(value.retryAt) - now, 3000);
  assert.equal(value.messages.length, 0);
  assert.equal(value.version, 1);
  assert.ok(!("owner" in value));
  const attempts = db.lockAttempts();
  response = await advance(env, "dates", "date-test");
  assert.equal(response.status, 202);
  assert.equal(calls, 1);
  assert.equal(db.lockAttempts(), attempts);
  now += 3100;
  response = await advance(env, "dates", "date-test");
  assert.equal(response.status, 200);
  value = (await response.json()) as any;
  assert.equal(calls, 2);
  assert.equal(value.messages.length, 1);
  assert.equal(value.stage, 1);
  assert.equal(value.version, 2);
  assert.ok(!value.retryAt);
  assert.ok(!value.error);
});

test("profile analysis preserves both extracted sources during a rate-limit wait", async (t) => {
  const db = database();
  t.after(db.close);
  const p = person("alex");
  const [liEvidence, igEvidence] = p.evidence;
  const job: Job = {
    id: "job-test",
    type: "ingest",
    status: "running",
    stage: "analyzing",
    linkedinUrl: p.linkedinUrl,
    instagramUrl: p.instagramUrl,
    createdAt: "",
    updatedAt: "",
    owner: session,
    version: 2,
    runIds: { linkedin: "saved-li-run", instagram: "saved-ig-run" },
    data: {
      li: {
        name: p.name,
        url: p.linkedinUrl,
        evidence: [liEvidence],
        publicVerified: true,
        rawText: liEvidence.text,
      },
      ig: {
        name: p.name,
        url: p.instagramUrl,
        evidence: [igEvidence],
        publicVerified: true,
        rawText: igEvidence.text,
      },
    },
  };
  await db.store.put("jobs", job.id, job);
  let calls = 0,
    now = Date.now();
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return calls === 1
      ? new Response("{}", { status: 429, headers: { "retry-after": "9" } })
      : modelResponse({
          summary:
            "Alex publicly shares photography and writing, with nature appearing in the Instagram biography.",
          traits: [
            {
              label: "Photography",
              category: "interest",
              status: "observed",
              confidence: "high",
              evidenceIds: ["alex-li", "alex-ig"],
            },
          ],
          questions: ["Would you enjoy sharing a photo walk?"],
        });
  });
  const env: Env = { DB: db.DB, GROQ_API_KEY: "test-key" };
  let response = await advance(env, "jobs", job.id);
  assert.equal(response.status, 202);
  const waiting = (await response.json()) as any;
  assert.equal(waiting.stage, "analyzing");
  assert.equal(waiting.status, "running");
  assert.equal(Date.parse(waiting.retryAt) - now, 9000);
  assert.ok(!("data" in waiting));
  assert.ok(!("runIds" in waiting));
  assert.ok(!("owner" in waiting));
  const saved = await db.store.get<Job>("jobs", job.id);
  assert.deepEqual(saved?.data, job.data);
  assert.deepEqual(saved?.runIds, job.runIds);
  response = await advance(env, "jobs", job.id);
  assert.equal(response.status, 202);
  assert.equal(calls, 1);
  now += 9100;
  response = await advance(env, "jobs", job.id);
  assert.equal(response.status, 200);
  const completed = (await response.json()) as any;
  assert.equal(completed.status, "complete");
  assert.equal(calls, 2);
  assert.equal((await db.store.list("people")).length, 1);
  const completeJob = await db.store.get<Job>("jobs", job.id);
  assert.ok(!completeJob?.retryAt);
  assert.ok(!completeJob?.error);
  assert.ok(!completeJob?.data);
});

test("retry delays use sixty seconds by default and never exceed five minutes", async (t) => {
  const db = database();
  t.after(db.close);
  await seedDate(db.store, "default-wait");
  await seedDate(db.store, "maximum-wait");
  const now = Date.now();
  t.mock.method(Date, "now", () => now);
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("{}", {
        status: 429,
        headers: ++calls === 1 ? {} : { "retry-after": "99999" },
      }),
  );
  const env: Env = { DB: db.DB, GROQ_API_KEY: "test-key" };
  const first = (await (
    await advance(env, "dates", "default-wait")
  ).json()) as any;
  const second = (await (
    await advance(env, "dates", "maximum-wait")
  ).json()) as any;
  assert.equal(Date.parse(first.retryAt) - now, 60000);
  assert.equal(Date.parse(second.retryAt) - now, 300000);
});

test("non-limit model errors still fail normally without automatic retries", async (t) => {
  const db = database();
  t.after(db.close);
  await seedDate(db.store);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("{}", { status: 500 }),
  );
  const response = await advance(
    { DB: db.DB, GROQ_API_KEY: "test-key" },
    "dates",
    "date-test",
  );
  const value = (await response.json()) as any;
  assert.equal(response.status, 400);
  assert.equal(value.status, "failed");
  assert.ok(!value.retryAt);
  assert.equal(value.messages.length, 0);
});

test("an Apify 429 remains a normal extraction failure rather than a model cooldown", async (t) => {
  const db = database();
  t.after(db.close);
  const p = person("alex");
  const job: Job = {
    id: "apify-job",
    type: "ingest",
    status: "running",
    stage: "queued",
    linkedinUrl: p.linkedinUrl,
    instagramUrl: p.instagramUrl,
    createdAt: "",
    updatedAt: "",
    owner: session,
    version: 0,
  };
  await db.store.put("jobs", job.id, job);
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({ error: { message: "Actor request limit reached" } }),
        { status: 429, headers: { "retry-after": "10" } },
      ),
  );
  const response = await advance(
    { DB: db.DB, APIFY_TOKEN: "test-apify-key" },
    "jobs",
    job.id,
  );
  const value = (await response.json()) as any;
  assert.equal(response.status, 400);
  assert.equal(value.status, "failed");
  assert.ok(!(await db.store.get<Job>("jobs", job.id))?.retryAt);
});
