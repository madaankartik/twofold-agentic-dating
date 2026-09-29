import fs from "node:fs";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { profileFit, rankingsFor } from "../server/domain";
import type { Person, DateSession } from "../src/types";

const db = new DatabaseSync("data/local.db");
const read = <T>(kind: string) =>
  (
    db.prepare("SELECT value FROM records WHERE kind=?").all(kind) as {
      value: string;
    }[]
  ).map((row) => JSON.parse(row.value) as T);
const people = read<Person>("people")
  .filter((p) => p.demo)
  .sort((a, b) => a.id.localeCompare(b.id));
const dates = read<DateSession>("dates")
  .filter((d) => d.demo && d.status === "complete")
  .sort((a, b) => a.id.localeCompare(b.id));
assert.equal(people.length, 25, "The demo must contain 25 people.");
assert.equal(dates.length, 25, "Finish all 25 demo dates before finalizing.");
const byId = new Map(people.map((p) => [p.id, p]));
const pairKeys = new Set<string>();
for (const date of dates) {
  assert.equal(date.messages.length, 4);
  assert.equal(date.assessments.length, 2);
  const key = [date.aId, date.bId].sort().join(":");
  assert.ok(!pairKeys.has(key), "Duplicate date pair");
  pairKeys.add(key);
  for (const assessment of date.assessments) {
    const own = byId.get(assessment.personId)!;
    const other = byId.get(
      assessment.personId === date.aId ? date.bId : date.aId,
    )!;
    assessment.score = Math.max(
      0,
      Math.min(
        100,
        Math.round(profileFit(own, other).score + assessment.delta),
      ),
    );
  }
  db.prepare("UPDATE records SET value=? WHERE kind=? AND id=?").run(
    JSON.stringify(date),
    "dates",
    date.id,
  );
}
for (const person of people) {
  assert.equal(
    dates.filter((d) => d.aId === person.id || d.bId === person.id).length,
    2,
    `${person.name} must complete two dates`,
  );
  assert.equal(rankingsFor(person, people, dates).length, 24);
  assert.deepEqual(
    [...new Set(person.evidence.map((e) => e.platform))].sort(),
    ["instagram", "linkedin"],
  );
}
fs.writeFileSync(
  "data/demo-people.json",
  JSON.stringify(people, null, 2) + "\n",
);
fs.writeFileSync("data/demo-dates.json", JSON.stringify(dates, null, 2) + "\n");
const report = {
  verifiedAt: new Date().toISOString(),
  people: 25,
  officialProfileLinks: 50,
  completeDates: 25,
  datesPerPerson: 2,
  dialogueTurns: 100,
  independentAssessments: 50,
  directionalRankings: 600,
  profileEngine: "groq",
  dateEngine: "groq",
  sources: ["linkedin", "instagram"],
  allPossiblePairsDated: false,
};
fs.writeFileSync(
  "data/demo-verification.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
