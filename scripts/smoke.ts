import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { parseInstagram } from "../server/sources";
import type { DateSession, Health, Person, Ranking } from "../src/types";

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787";
const output = process.env.SMOKE_OUTPUT || "/tmp/twofold-smoke-results.json";
const liveIngest = process.argv.includes("--live-ingest");
const requireDates = process.argv.includes("--require-dates");
const resumeIngest = process.argv.includes("--resume-ingest");
const statePath =
  process.env.SMOKE_SESSION_FILE || "/tmp/twofold-smoke-session.json";
const savedState: { cookieA?: string; jobId?: string; recoveryNote?: string } =
  resumeIngest ? JSON.parse(await readFile(statePath, "utf8")) : {};
const results: {
  name: string;
  status: "pass" | "fail" | "pending";
  detail?: unknown;
}[] = [];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const bounded = (n: number, min = 0, max = 100) =>
  Number.isFinite(n) && n >= min && n <= max;

class Client {
  constructor(private cookie = "") {}
  sessionCookie() {
    return this.cookie;
  }
  async request<T = unknown>(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(65000),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    const data = (await response.json()) as T;
    return { status: response.status, data };
  }
}
const visitorA = new Client(savedState.cookieA);
const visitorB = new Client();
async function check(name: string, fn: () => Promise<unknown> | unknown) {
  try {
    const detail = await fn();
    results.push({
      name,
      status: "pass",
      ...(detail === undefined ? {} : { detail }),
    });
    console.log(`PASS ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, status: "fail", detail });
    console.log(`FAIL ${name}: ${detail}`);
  }
}
let people: Person[] = [];
let dates: DateSession[] = [];
let freshPersonId: string | undefined;
let freshJobId: string | undefined = savedState.jobId;

await check(
  "Health exposes working storage and configured source/model adapters",
  async () => {
    const response = await visitorA.request<Health>("/api/health");
    assert.equal(response.status, 200);
    assert.equal(response.data.storage, true);
    assert.equal(typeof response.data.apify, "boolean");
    assert.equal(typeof response.data.groq, "boolean");
    if (liveIngest) {
      assert.equal(response.data.apify, true);
      assert.equal(response.data.groq, true);
    }
    return response.data;
  },
);
await check(
  "25 ready demo profiles have exactly the two permitted source platforms",
  async () => {
    const response = await visitorB.request<Person[]>("/api/people");
    assert.equal(response.status, 200);
    people = response.data;
    const demo = people.filter((p) => p.demo);
    assert.equal(demo.length, 25);
    assert.equal(new Set(demo.map((p) => p.id)).size, 25);
    for (const p of demo) {
      assert.equal(p.status, "ready", `${p.name} is not ready`);
      assert.deepEqual(
        [...new Set(p.evidence.map((e) => e.platform))].sort(),
        ["instagram", "linkedin"],
        `${p.name}: platform coverage`,
      );
      assert.ok(
        Object.values(p.sourceStatus).every(Boolean),
        `${p.name}: verification flags`,
      );
      assert.ok(!("owner" in p), "Private owner token leaked");
      const ids = new Set(p.evidence.map((e) => e.id));
      assert.equal(
        ids.size,
        p.evidence.length,
        `${p.name}: duplicate evidence IDs`,
      );
      for (const evidence of p.evidence) {
        assert.ok(evidence.text.trim(), `${p.name}: empty evidence`);
        const host = new URL(evidence.url).hostname;
        assert.ok(
          evidence.platform === "linkedin"
            ? /(^|\.)linkedin\.com$/.test(host)
            : /(^|\.)instagram\.com$/.test(host),
          `${p.name}: unrelated evidence URL`,
        );
      }
      for (const trait of p.traits) {
        assert.ok(trait.evidenceIds.length > 0);
        assert.ok(
          trait.evidenceIds.every((id) => ids.has(id)),
          `${p.name}: unsupported trait citation`,
        );
      }
      const detail = await visitorB.request<Person>(`/api/people/${p.id}`);
      assert.equal(detail.status, 200);
      assert.equal(detail.data.id, p.id);
    }
    return {
      demoProfiles: demo.length,
      sourcePlatforms: ["linkedin", "instagram"],
    };
  },
);
await check(
  "Each profile ranks all other visible ready people once, with bounded descending scores",
  async () => {
    assert.ok(people.length >= 25, "Profiles must load first");
    const ready = people.filter((p) => p.status === "ready");
    for (const p of ready) {
      const response = await visitorB.request<Ranking[]>(
        `/api/people/${p.id}/rankings`,
      );
      assert.equal(response.status, 200);
      const ranks = response.data;
      assert.equal(ranks.length, ready.length - 1, `${p.name}: ranking count`);
      assert.equal(new Set(ranks.map((r) => r.personId)).size, ranks.length);
      ranks.forEach((r, i) => {
        assert.notEqual(r.personId, p.id, "Self ranked");
        assert.ok(
          ready.some((x) => x.id === r.personId),
          "Unknown person ranked",
        );
        assert.equal(r.rank, i + 1);
        assert.ok(bounded(r.score));
        assert.ok(bounded(r.baseScore));
        assert.ok(bounded(r.dateDelta, -10, 10));
        if (i) assert.ok(ranks[i - 1].score >= r.score, "Scores out of order");
        assert.ok(r.reasons.length > 0);
      });
    }
    return { profiles: ready.length, rankingsPerPerson: ready.length - 1 };
  },
);
await check(
  "Invalid URLs, wrong platforms and missing data are rejected before ingestion",
  async () => {
    const invalid = [
      {},
      {
        linkedinUrl: "http://localhost/admin",
        instagramUrl: "https://www.instagram.com/drewbinsky/",
      },
      {
        linkedinUrl: "https://www.linkedin.com/company/example/",
        instagramUrl: "https://www.instagram.com/drewbinsky/",
      },
      {
        linkedinUrl: "https://www.linkedin.com/in/drewbinsky/",
        instagramUrl: "https://www.instagram.com/p/ABC/",
      },
      {
        linkedinUrl: "https://www.linkedin.com.evil.example/in/drewbinsky/",
        instagramUrl: "https://www.instagram.com/drewbinsky/",
      },
    ];
    for (const body of invalid) {
      const r = await visitorA.request<{ error: string }>(
        "/api/people",
        "POST",
        body,
      );
      assert.equal(r.status, 400);
      assert.ok(r.data.error);
    }
    return { rejectedCases: invalid.length };
  },
);
await check(
  "Cross-origin writes, self-dates and unavailable profiles are blocked",
  async () => {
    const origin = await visitorA.request(
      "/api/people",
      "POST",
      {
        linkedinUrl: "https://www.linkedin.com/in/drewbinsky/",
        instagramUrl: "https://www.instagram.com/drewbinsky/",
      },
      { Origin: "https://unrelated.example" },
    );
    assert.equal(origin.status, 403);
    assert.ok(people[0]);
    const self = await visitorA.request("/api/dates", "POST", {
      aId: people[0].id,
      bId: people[0].id,
    });
    assert.equal(self.status, 400);
    const missing = await visitorA.request("/api/dates", "POST", {
      aId: people[0].id,
      bId: "not-a-profile",
    });
    assert.equal(missing.status, 400);
  },
);
await check(
  "Parser rejects an explicitly private Instagram fixture; metadata alone stays unverified",
  () => {
    // This is an adapter-level fixture check, not a claim that a real private account was fetched.
    const url = "https://www.instagram.com/fixture_account/";
    const html =
      '<meta name="description" content="Fixture account makes photographs and travel films." />';
    const context = {
      context: {
        full_name: "Fixture Account",
        graphql_media: [
          {
            shortcode_media: {
              shortcode: "fixture",
              owner: { username: "fixture_account", is_private: true },
              edge_media_to_caption: { edges: [] },
            },
          },
        ],
      },
    };
    const embed = JSON.stringify({ contextJSON: JSON.stringify(context) });
    assert.throws(() => parseInstagram(html, embed, url), /private/i);
    assert.equal(parseInstagram(html, "", url).publicVerified, false);
    return {
      scope:
        "synthetic adapter fixtures; no real private-account scraping performed",
    };
  },
);
await check("Existing pair reports a cache hit honestly", async () => {
  assert.ok(people[0]);
  const p = people[0];
  const r = await visitorA.request<{ personId: string; cached: boolean }>(
    "/api/people",
    "POST",
    { linkedinUrl: p.linkedinUrl, instagramUrl: p.instagramUrl },
  );
  assert.equal(r.status, 200);
  assert.equal(r.data.cached, true);
  assert.equal(r.data.personId, p.id);
});

if (liveIngest) {
  await check(
    "Genuinely new pair runs through public ingestion and stays isolated between sessions",
    async () => {
      const pair = {
        linkedinUrl: "https://www.linkedin.com/in/drewbinsky/",
        instagramUrl: "https://www.instagram.com/drewbinsky/",
      };
      assert.ok(
        !people.some((p) => p.instagramUrl === pair.instagramUrl),
        "Freshness precondition failed: Drew Binsky is already visible; no cache-busting workaround attempted.",
      );
      if (!resumeIngest) {
        const started = await visitorA.request<{
          jobId?: string;
          cached?: boolean;
        }>("/api/people", "POST", pair);
        assert.equal(started.status, 202);
        assert.equal(started.data.cached, undefined);
        assert.ok(started.data.jobId);
        freshJobId = started.data.jobId;
        await writeFile(
          statePath,
          JSON.stringify({
            cookieA: visitorA.sessionCookie(),
            jobId: freshJobId,
          }),
          { mode: 0o600 },
        );
      }
      assert.ok(freshJobId, "No saved ingestion job is available to resume.");
      const ownJob = await visitorA.request<Record<string, unknown>>(
        `/api/jobs/${freshJobId}`,
      );
      assert.equal(ownJob.status, 200);
      assert.ok(!("owner" in ownJob.data));
      assert.ok(!("runIds" in ownJob.data));
      assert.ok(!("data" in ownJob.data));
      assert.equal(
        (await visitorB.request(`/api/jobs/${freshJobId}`)).status,
        404,
      );
      assert.equal(
        (await visitorB.request(`/api/jobs/${freshJobId}/advance`, "POST"))
          .status,
        404,
      );
      const stages: string[] = [];
      for (let attempt = 0; attempt < 45; attempt++) {
        let advanced;
        try {
          advanced = await visitorA.request<{
            status?: string;
            stage?: string;
            personId?: string;
            error?: string;
          }>(`/api/jobs/${freshJobId}/advance`, "POST");
        } catch (error) {
          if (attempt === 44) throw error;
          // Advancing an existing persisted job is retryable; creating a new job is never retried automatically.
          stages.push("connection-interrupted; retrying-existing-job");
          await sleep(4000);
          continue;
        }
        if (advanced.data.stage) stages.push(advanced.data.stage);
        if (
          advanced.status === 400 &&
          /rate.limit/i.test(advanced.data.error || "")
        ) {
          stages.push("model-rate-limited; retrying-existing-job");
          await sleep(5000);
          continue;
        }
        if (advanced.status === 400)
          throw new Error(
            `Fresh ingestion failed: ${advanced.data.error}; job ${freshJobId}; stages ${stages.join(", ")}`,
          );
        assert.ok([200, 202].includes(advanced.status));
        if (advanced.data.status === "complete") {
          freshPersonId = advanced.data.personId;
          break;
        }
        await sleep(4000);
      }
      assert.ok(
        freshPersonId,
        `Fresh ingestion did not complete within 45 advances; job ${freshJobId}`,
      );
      const fresh = await visitorA.request<Person>(
        `/api/people/${freshPersonId}`,
      );
      assert.equal(fresh.status, 200);
      assert.equal(fresh.data.status, "ready");
      assert.equal(fresh.data.demo, false);
      assert.equal(fresh.data.sourceStatus.publicVerified, true);
      assert.equal(fresh.data.sourceStatus.identityVerified, true);
      assert.deepEqual(
        [...new Set(fresh.data.evidence.map((e) => e.platform))].sort(),
        ["instagram", "linkedin"],
      );
      assert.equal(
        (await visitorB.request(`/api/people/${freshPersonId}`)).status,
        404,
      );
      assert.equal(
        (await visitorB.request(`/api/people/${freshPersonId}/rankings`))
          .status,
        404,
      );
      const isolated = await visitorB.request<Person[]>("/api/people");
      assert.ok(!isolated.data.some((p) => p.id === freshPersonId));
      const reloaded = await visitorA.request<Person>(
        `/api/people/${freshPersonId}`,
      );
      assert.equal(reloaded.data.id, freshPersonId);
      return {
        name: fresh.data.name,
        jobId: freshJobId,
        personId: freshPersonId,
        stages,
        engine: fresh.data.engine,
        evidenceCount: fresh.data.evidence.length,
        identityVerified: true,
        publicVerified: true,
        otherSessionVisible: false,
        resumed: resumeIngest,
        recoveryNote: savedState.recoveryNote,
      };
    },
  );
} else
  results.push({
    name: "Fresh-link ingestion and new-job session isolation",
    status: "pending",
    detail:
      "Run with --live-ingest to use real Apify/Groq calls. No cache-busting or simulated extraction is used.",
  });

await check(
  "Saved date participants, turns, assessments and citations are internally valid",
  async () => {
    const response = await visitorB.request<DateSession[]>("/api/dates");
    assert.equal(response.status, 200);
    dates = response.data;
    const byId = new Map(people.map((p) => [p.id, p]));
    for (const d of dates) {
      assert.notEqual(d.aId, d.bId);
      assert.ok(byId.has(d.aId));
      assert.ok(byId.has(d.bId));
      assert.ok(!("owner" in d));
      assert.ok(d.messages.length <= 4);
      assert.ok(d.assessments.length <= 2);
      d.messages.forEach((m, i) => {
        assert.equal(m.personId, i % 2 === 0 ? d.aId : d.bId);
        assert.ok(m.text.trim());
        const ids = new Set(byId.get(m.personId)!.evidence.map((e) => e.id));
        assert.ok(
          m.evidenceIds.every((id) => ids.has(id)),
          `${d.id}: unsupported message citation`,
        );
      });
      assert.equal(
        new Set(d.assessments.map((a) => a.personId)).size,
        d.assessments.length,
      );
      for (const a of d.assessments) {
        assert.ok([d.aId, d.bId].includes(a.personId));
        assert.ok(bounded(a.score));
        assert.ok(bounded(a.delta, -10, 10));
        const ids = new Set(byId.get(a.personId)!.evidence.map((e) => e.id));
        assert.ok(
          a.evidenceIds.every((id) => ids.has(id)),
          `${d.id}: unsupported assessment citation`,
        );
      }
      if (d.status === "complete") {
        assert.equal(d.messages.length, 4);
        assert.equal(d.assessments.length, 2);
        assert.equal(d.stage, 6);
      }
    }
    if (dates.length)
      assert.equal(
        (await visitorA.request(`/api/dates/${dates[0].id}/advance`, "POST"))
          .status,
        403,
        "Saved demo must be read-only",
      );
    return {
      dates: dates.length,
      completed: dates.filter((d) => d.status === "complete").length,
      messages: dates.reduce((s, d) => s + d.messages.length, 0),
      assessments: dates.reduce((s, d) => s + d.assessments.length, 0),
    };
  },
);
const completed = dates.filter((d) => d.status === "complete");
const datedPeople = new Set(completed.flatMap((d) => [d.aId, d.bId]));
const coverageReady =
  people.filter((p) => p.demo).every((p) => datedPeople.has(p.id)) &&
  datedPeople.size >= 25;
results.push({
  name: "Every demo person has participated in a completed date",
  status: coverageReady ? "pass" : requireDates ? "fail" : "pending",
  detail: {
    completedDates: completed.length,
    distinctDatedPeople: datedPeople.size,
    requiredPeople: 25,
  },
});
const report = {
  testedAt: new Date().toISOString(),
  base,
  overall: results.some((r) => r.status === "fail")
    ? "fail"
    : results.some((r) => r.status === "pending")
      ? "pending"
      : "pass",
  freshJobId,
  freshPersonId,
  checks: results,
  limitations: [
    "Private-account rejection is exercised with an explicit parser fixture; no private account was scraped.",
    "The script validates citation references, not every natural-language claim’s semantic fidelity.",
  ],
};
await writeFile(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      overall: report.overall,
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
      pending: results.filter((r) => r.status === "pending").length,
      report: output,
      freshJobId,
      freshPersonId,
    },
    null,
    2,
  ),
);
if (report.overall === "fail") process.exitCode = 1;
