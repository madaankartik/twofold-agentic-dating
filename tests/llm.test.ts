import test from "node:test";
import assert from "node:assert/strict";
import {
  complete,
  modelTurn,
  modelAssessment,
  modelProfile,
  ModelRequestError,
} from "../server/llm";
import { makePerson } from "../server/domain";
import type { DateSession, Evidence, Person, Trait } from "../src/types";

function person(id: string): Person {
  const evidence: Evidence[] = Array.from({ length: 7 }, (_, i) => ({
    id: `${id}-source-${i}`,
    platform: i < 3 ? "linkedin" : "instagram",
    url:
      i < 3
        ? "https://www.linkedin.com/in/example/"
        : "https://www.instagram.com/example/",
    text: (i === 6
      ? "I enjoy taking wildlife photos on weekend walks. "
      : i === 5
        ? "I publicly prioritize learning new creative skills. "
        : "I write about my work and creative interests. "
    ).repeat(8),
    kind: i < 3 ? "about" : "post",
    retrievedAt: "2026-09-29T00:00:00Z",
  }));
  const p = makePerson({
    id,
    name: `${id} Example`,
    linkedinUrl: evidence[0].url,
    instagramUrl: evidence[6].url,
    evidence,
    publicVerified: true,
    identityVerified: true,
    identityNote: "Fixture",
  });
  p.traits = [
    {
      label: "Technology",
      category: "interest",
      evidenceIds: [`${id}-source-0`],
    },
    {
      label: "Photography",
      category: "hobby",
      evidenceIds: [`${id}-source-6`],
    },
    {
      label: "Learning",
      category: "priority",
      evidenceIds: [`${id}-source-5`],
    },
  ].map((t) => ({ ...t, status: "observed", confidence: "high" }) as Trait);
  return p;
}
function date(a: Person, b: Person): DateSession {
  return {
    id: "test-date",
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
  };
}
function success(value: unknown, usage?: unknown) {
  return new Response(
    JSON.stringify({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(value) } },
      ],
      usage,
    }),
    { headers: { "content-type": "application/json" } },
  );
}

test("turn context keeps both sources and personal evidence with strict own-source citation IDs", async (t) => {
  const a = person("alex"),
    b = person("blair");
  let request: any;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: any) => {
    request = JSON.parse(options.body);
    const ids =
      request.response_format.json_schema.schema.properties.evidenceIds.items
        .enum;
    return success({
      text: "In this fictional café scene, I turn toward the nature photograph and ask which detail catches your eye.",
      evidenceIds: [ids.find((id: string) => id === "alex-source-6")],
      proposal: "gallery",
    });
  });
  const turn = await modelTurn("secret-key", "test-model", a, b, date(a, b));
  const payload = JSON.parse(request.messages[1].content);
  const sources = payload.self.sources;
  assert.ok(sources.length <= 4);
  assert.deepEqual(
    new Set(sources.map((s: any) => s[1])),
    new Set(["linkedin", "instagram"]),
  );
  assert.ok(sources.some((s: any) => s[0] === "alex-source-6"));
  assert.ok(sources.some((s: any) => s[0] === "alex-source-5"));
  assert.ok(sources.every((s: any) => s[2].length <= 160));
  assert.equal(turn.stage, "Opening");
  assert.ok(
    payload.self.themes.some(
      (theme: any) => theme[0] === "Photography" && theme[1] === "hobby",
    ),
  );
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(request.max_completion_tokens, 650);
  assert.match(request.messages[0].content, /Do not arrange a future meeting/);
  assert.match(payload.scene, /already underway/);
  assert.ok(!JSON.stringify(payload).includes("blair-source-"));
  assert.ok(!JSON.stringify(payload).includes("secret-key"));
});

test("all scene choices change the fictional setting and advancing turns respond to the interaction", async (t) => {
  const a = person("alex"),
    b = person("blair");
  const requests: any[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: any) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    return success({
      text: "In the simulation, I choose the portrait and invite a different interpretation.",
      evidenceIds: [
        request.response_format.json_schema.schema.properties.evidenceIds.items
          .enum[0],
      ],
      proposal: "gallery",
    });
  });
  for (const scenario of [
    "First coffee",
    "A weekend afternoon",
    "Something new",
  ])
    await modelTurn("key", "test-model", a, b, { ...date(a, b), scenario });
  assert.equal(
    new Set(requests.map((r) => JSON.parse(r.messages[1].content).scene)).size,
    3,
  );
  const d = date(a, b);
  d.messages = [
    {
      id: "message-1",
      personId: a.id,
      text: "Would you choose the bright landscape or the quieter portrait?",
      stage: "Opening",
      evidenceIds: ["alex-source-6"],
      proposal: "gallery",
      createdAt: "",
    },
  ];
  await modelTurn("key", "test-model", b, a, d);
  const request = requests.at(-1),
    payload = JSON.parse(request.messages[1].content);
  assert.match(request.messages[0].content, /gentle tradeoff/);
  assert.equal(payload.conversation[0].speaker, "other");
  assert.equal(payload.conversation[0].text, d.messages[0].text);
  assert.ok(!JSON.stringify(payload.conversation).includes("alex-source-6"));
});

test("runtime validation rejects another agent’s citation even if a provider violates its schema", async (t) => {
  const a = person("alex"),
    b = person("blair");
  t.mock.method(globalThis, "fetch", async () =>
    success({
      text: "We consider a photograph together in this imagined scene.",
      evidenceIds: ["blair-source-6"],
      proposal: "gallery",
    }),
  );
  await assert.rejects(
    () => modelTurn("key", "test-model", a, b, date(a, b)),
    /unsupported citation/,
  );
});

test("duplicate dialogue is rejected even when punctuation and capitalization change", async (t) => {
  const a = person("alex"),
    b = person("blair"),
    d = date(a, b);
  d.messages = [
    {
      id: "previous",
      personId: a.id,
      text: "In this fictional café, I choose the portrait. Which detail catches your eye?",
      stage: "Opening",
      evidenceIds: ["alex-source-6"],
      proposal: "gallery",
      createdAt: "",
    },
  ];
  t.mock.method(globalThis, "fetch", async () =>
    success({
      text: "IN THIS FICTIONAL CAFÉ — I choose the portrait! Which detail catches your eye?",
      evidenceIds: ["blair-source-6"],
      proposal: "gallery",
    }),
  );
  await assert.rejects(
    () => modelTurn("key", "test-model", b, a, d),
    /repeated an earlier turn/,
  );
  assert.equal(d.messages.length, 1);
});

test("dialogue and verdicts cannot be accepted without source citations", async (t) => {
  const a = person("alex"),
    b = person("blair");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () =>
    success(
      ++calls === 1
        ? {
            text: "We look at the artwork together in this fictional scene.",
            evidenceIds: [],
            proposal: "gallery",
          }
        : {
            delta: 3,
            decision: "maybe",
            reasons: ["A thoughtful exchange."],
            unknowns: ["Actual interest."],
            evidenceIds: [],
          },
    ),
  );
  await assert.rejects(
    () => modelTurn("key", "test-model", a, b, date(a, b)),
    /at least 1/,
  );
  await assert.rejects(
    () => modelAssessment("key", "test-model", a, b, date(a, b), 60),
    /at least 1/,
  );
});

test("assessment receives its own evidence and dialogue but never the other verdict", async (t) => {
  const a = person("alex"),
    b = person("blair");
  const d = date(a, b);
  d.messages = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`,
    personId: i % 2 ? b.id : a.id,
    text: "An imagined shared action, a specific response, and a choice.".repeat(
      8,
    ),
    stage: "Decision",
    evidenceIds: [i % 2 ? "blair-source-6" : "alex-source-6"],
    createdAt: "",
    proposal: "gallery",
  }));
  d.assessments = [
    {
      personId: b.id,
      score: 99,
      delta: 9,
      decision: "explore",
      reasons: ["OTHER_AGENT_PRIVATE_VERDICT"],
      unknowns: [],
      evidenceIds: ["blair-source-6"],
    },
  ];
  let request: any;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: any) => {
    request = JSON.parse(options.body);
    return success({
      delta: -3,
      decision: "maybe",
      reasons: [
        "They responded to the photograph choice.",
        "The second activity remains uncertain.",
      ],
      unknowns: ["Does the person enjoy this activity socially?"],
      evidenceIds: ["alex-source-6"],
    });
  });
  const result = await modelAssessment("key", "test-model", a, b, d, 70);
  const payload = JSON.parse(request.messages[1].content);
  assert.equal(result.score, 67);
  assert.equal(result.delta, -3);
  assert.equal(payload.conversation.length, 4);
  assert.ok(payload.self.sources.some((s: any) => s[0] === "alex-source-6"));
  assert.ok(!JSON.stringify(payload).includes("OTHER_AGENT_PRIVATE_VERDICT"));
  assert.ok(!JSON.stringify(payload).includes("blair-source-6"));
  assert.match(request.messages[0].content, /need not match theirs/);
  // Character-budget regression guard; actual tokens depend on the model tokenizer.
  assert.ok(
    request.messages.reduce(
      (sum: number, m: any) => sum + m.content.length,
      0,
    ) +
      JSON.stringify(request.response_format.json_schema.schema).length <
      3600,
  );
});

test("429 retry metadata and diagnostics omit provider text and secrets", async (t) => {
  const diagnostics: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          error: { message: "raw-secret-key private source text" },
        }),
        { status: 429, headers: { "retry-after": "12" } },
      ),
  );
  await assert.rejects(
    () =>
      complete(
        "raw-secret-key",
        "test-model",
        "private source text",
        {},
        600,
        undefined,
        (d) => diagnostics.push(d),
      ),
    (error: unknown) => {
      assert.ok(error instanceof ModelRequestError);
      assert.equal(error.status, 429);
      assert.equal(error.retryAfterMs, 12000);
      assert.match(error.message, /retry in 12 seconds/);
      assert.ok(!error.message.includes("raw-secret-key"));
      return true;
    },
  );
  assert.deepEqual(diagnostics, [{ status: 429, retryAfterMs: 12000 }]);
});

test("usage diagnostics report counts and tolerate a broken optional logger", async (t) => {
  const diagnostics: unknown[] = [];
  t.mock.method(globalThis, "fetch", async () =>
    success({ ok: true }, { prompt_tokens: 730, completion_tokens: 120 }),
  );
  assert.deepEqual(
    await complete("key", "test-model", "system", {}, 600, undefined, (d) => {
      diagnostics.push(d);
      throw new Error("logger failed");
    }),
    { ok: true },
  );
  assert.deepEqual(diagnostics, [
    { status: 200, promptTokens: 730, completionTokens: 120 },
  ]);
});

test("profile output constrains nested evidence IDs and keeps public priorities distinct from romantic needs", async (t) => {
  const a = person("alex");
  let request: any;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: any) => {
    request = JSON.parse(options.body);
    return success({
      summary:
        "Alex shares an interest in photography and publicly discusses learning creative skills.",
      traits: [
        {
          label: "Learning",
          category: "priority",
          status: "observed",
          confidence: "high",
          evidenceIds: ["alex-source-5"],
        },
      ],
      questions: ["Would you enjoy sharing a creative activity?"],
    });
  });
  const result = await modelProfile("key", "test-model", a);
  const schema = request.response_format.json_schema.schema;
  assert.deepEqual(
    schema.properties.traits.items.properties.evidenceIds.items.enum,
    a.evidence.map((e) => e.id),
  );
  assert.equal(result.traits[0].category, "priority");
  assert.deepEqual(result.unknowns, a.unknowns);
  assert.match(
    request.messages[0].content,
    /do not turn career or hobbies into romantic needs/,
  );
});
