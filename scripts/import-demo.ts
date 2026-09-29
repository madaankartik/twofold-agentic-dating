import fs from "node:fs/promises";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env.local" });

const evidenceSchema = z.object({
  id: z.string().min(1),
  platform: z.enum(["linkedin", "instagram"]),
  url: z.string().url(),
  text: z.string().min(1),
  kind: z.enum(["bio", "post", "about", "experience"]),
  retrievedAt: z.string(),
  access: z.enum(["direct", "search-index", "apify"]).optional(),
});
const personSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  headline: z.string(),
  summary: z.string(),
  initials: z.string(),
  color: z.string(),
  linkedinUrl: z.string().url(),
  instagramUrl: z.string().url(),
  instagramHandle: z.string(),
  imageUrl: z.string().optional(),
  evidence: z.array(evidenceSchema).min(2),
  traits: z
    .array(
      z.object({
        label: z.string(),
        evidenceIds: z.array(z.string()).min(1),
        confidence: z.enum(["high", "medium", "low"]),
        status: z.enum(["observed", "tentative"]),
        category: z.enum(["interest", "hobby", "priority"]),
      }),
    )
    .min(1),
  unknowns: z.array(z.string()),
  questions: z.array(z.string()),
  sourceStatus: z.object({
    linkedin: z.literal(true),
    instagram: z.literal(true),
    publicVerified: z.literal(true),
    identityVerified: z.literal(true),
  }),
  status: z.literal("ready"),
  identityNote: z.string(),
  createdAt: z.string(),
  engine: z.enum(["grounded-rules", "groq"]),
  demo: z.literal(true),
});
const dateSchema = z.object({
  id: z.string().min(1),
  aId: z.string(),
  bId: z.string(),
  scenario: z.string(),
  status: z.literal("complete"),
  messages: z
    .array(
      z.object({
        id: z.string(),
        personId: z.string(),
        text: z.string().min(1),
        stage: z.string(),
        evidenceIds: z.array(z.string()),
        createdAt: z.string(),
        proposal: z.string().optional(),
      }),
    )
    .length(4),
  assessments: z
    .array(
      z.object({
        personId: z.string(),
        score: z.number().min(0).max(100),
        delta: z.number().min(-10).max(10),
        decision: z.enum(["explore", "maybe", "pass"]),
        reasons: z.array(z.string()).min(1),
        unknowns: z.array(z.string()),
        evidenceIds: z.array(z.string()),
      }),
    )
    .length(2),
  stage: z.number(),
  engine: z.enum(["grounded-rules", "groq"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  demo: z.literal(true),
  version: z.number(),
});

function requireCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function options() {
  let url = process.env.TWOFOLD_ORIGIN || "http://127.0.0.1:8787";
  let dryRun = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--url" && args[i + 1]) url = args[++i];
    else
      throw new Error(
        "Usage: npm run seed:import -- [--url https://your-origin] [--dry-run]",
      );
  }
  const target = new URL(url);
  requireCondition(
    !target.username &&
      !target.password &&
      !target.search &&
      !target.hash &&
      target.pathname === "/",
    "Use only an origin, such as https://your-worker.workers.dev, without credentials, path, query or fragment.",
  );
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  requireCondition(
    target.protocol === "https:" || (target.protocol === "http:" && local),
    "Remote imports require HTTPS; HTTP is allowed only for localhost.",
  );
  return { origin: target.origin, dryRun };
}

async function readJson(path: string) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    throw new Error(
      `Cannot read ${path}. Run from the project root and use a release containing both demo JSON files.`,
    );
  }
}

async function main() {
  const { origin, dryRun } = options();
  const people = z
    .array(personSchema)
    .min(25)
    .parse(await readJson("data/demo-people.json"));
  const dates = z
    .array(dateSchema)
    .min(25)
    .parse(await readJson("data/demo-dates.json"));
  const byId = new Map(people.map((person) => [person.id, person]));
  requireCondition(
    byId.size === people.length,
    "Duplicate person IDs in demo data.",
  );
  requireCondition(
    new Set(dates.map((date) => date.id)).size === dates.length,
    "Duplicate date IDs in demo data.",
  );
  const partners = new Map(
    people.map((person) => [person.id, new Set<string>()]),
  );
  const pairs = new Set<string>();
  for (const person of people) {
    const ids = new Set(person.evidence.map((item) => item.id));
    requireCondition(
      new Set(person.evidence.map((item) => item.platform)).size === 2,
      `${person.name} needs evidence from both sources.`,
    );
    requireCondition(
      person.traits.every((trait) =>
        trait.evidenceIds.every((id) => ids.has(id)),
      ),
      `${person.name} has an invalid trait citation.`,
    );
  }
  for (const date of dates) {
    requireCondition(
      date.aId !== date.bId && byId.has(date.aId) && byId.has(date.bId),
      `Date ${date.id} references invalid participants.`,
    );
    const pair = [date.aId, date.bId].sort().join(":");
    requireCondition(
      !pairs.has(pair),
      `Duplicate prepared pair in ${date.id}.`,
    );
    pairs.add(pair);
    partners.get(date.aId)!.add(date.bId);
    partners.get(date.bId)!.add(date.aId);
    requireCondition(
      new Set(date.assessments.map((item) => item.personId)).size === 2,
      `Date ${date.id} needs two independent assessments.`,
    );
    requireCondition(
      date.messages.every(
        (message, index) =>
          message.personId === (index % 2 ? date.bId : date.aId),
      ),
      `Date ${date.id} must have four alternating turns.`,
    );
    for (const item of [...date.messages, ...date.assessments]) {
      requireCondition(
        [date.aId, date.bId].includes(item.personId),
        `Invalid agent in date ${date.id}.`,
      );
      const ids = new Set(
        byId.get(item.personId)!.evidence.map((evidence) => evidence.id),
      );
      requireCondition(
        item.evidenceIds.every((id) => ids.has(id)),
        `Invalid agent citation in date ${date.id}.`,
      );
    }
  }
  requireCondition(
    [...partners.values()].every((value) => value.size >= 2),
    "Every prepared person must have completed dates with at least two different partners.",
  );
  console.log(
    `Validated ${people.length} profiles, ${dates.length} completed dates, ${people.length * (people.length - 1)} directional comparisons.`,
  );
  if (dryRun) {
    console.log("Validation only. No network requests or database changes.");
    return;
  }

  const token = process.env.ADMIN_TOKEN;
  requireCondition(
    token,
    "Set ADMIN_TOKEN in .env.local or the environment. It must match the target server secret.",
  );
  console.log(`Importing into ${origin} in batches of at most 20 records.`);
  for (const kind of ["people", "dates"] as const) {
    const records = kind === "people" ? people : dates;
    for (let offset = 0; offset < records.length; offset += 20) {
      const response = await fetch(`${origin}/api/admin/seed`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          people: [],
          dates: [],
          [kind]: records.slice(offset, offset + 20),
        }),
      });
      requireCondition(
        response.ok,
        `Import failed (HTTP ${response.status}). Check server health, ADMIN_TOKEN and D1 migrations. Re-running safely resumes by record ID.`,
      );
      console.log(
        `Imported ${Math.min(offset + 20, records.length)}/${records.length} ${kind}.`,
      );
    }
  }
  for (const [kind, expected] of [
    ["people", people],
    ["dates", dates],
  ] as const) {
    const response = await fetch(`${origin}/api/${kind}`, {
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    requireCondition(
      response.ok,
      `Readback failed for ${kind} (HTTP ${response.status}).`,
    );
    const saved = z
      .array(
        z.object({ id: z.string(), status: z.string(), demo: z.boolean() }),
      )
      .parse(await response.json());
    requireCondition(
      expected.every((item) =>
        saved.some(
          (value) =>
            value.id === item.id && value.status === item.status && value.demo,
        ),
      ),
      `Readback did not contain all expected completed ${kind}.`,
    );
  }
  console.log(`Verified saved demo at ${origin}/#people`);
}

main().catch((error) => {
  if (error instanceof z.ZodError) {
    console.error(
      "Demo validation failed. Import requires 25 ready profiles and at least 25 complete dates with valid evidence.",
    );
    console.error(
      error.issues
        .slice(0, 6)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    );
  } else
    console.error(error instanceof Error ? error.message : "Import failed.");
  process.exitCode = 1;
});
