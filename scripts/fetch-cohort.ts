import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
const people: { linkedinUrl: string; instagramUrl: string }[] = JSON.parse(
  fs.readFileSync("data/cohort.json", "utf8"),
);
fs.mkdirSync("data/private", { recursive: true });
const token = process.env.APIFY_TOKEN;
if (!token)
  throw new Error("Set APIFY_TOKEN in .env.local before fetching the cohort.");
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
async function request(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new Error(
      `Apify returned ${response.status}; saved run identifiers are retained for retry.`,
    );
  return response.json() as Promise<any>;
}
async function run(platform: string, actor: string, input: unknown) {
  const resultPath = `data/private/${platform}.json`;
  if (fs.existsSync(resultPath)) {
    console.log(platform, "using saved source response");
    return;
  }
  const runPath = `data/private/${platform}-run.json`;
  let data: any;
  if (fs.existsSync(runPath))
    data = JSON.parse(fs.readFileSync(runPath, "utf8"));
  else {
    data = (
      await request(
        `https://api.apify.com/v2/acts/${actor}/runs?maxTotalChargeUsd=1`,
        input,
      )
    ).data;
    fs.writeFileSync(runPath, JSON.stringify({ id: data.id }));
  }
  console.log(platform, "run", data.id);
  for (let attempt = 0; attempt < 60; attempt++) {
    const current = (
      await request(`https://api.apify.com/v2/actor-runs/${data.id}`)
    ).data;
    if (current.status === "SUCCEEDED") {
      const records = await request(
        `https://api.apify.com/v2/datasets/${current.defaultDatasetId}/items?clean=true`,
      );
      if (
        !Array.isArray(records) ||
        !records.length ||
        records.every((r) => r.error)
      )
        throw new Error(`${platform} returned no valid records.`);
      fs.writeFileSync(resultPath, JSON.stringify(records, null, 2));
      console.log(platform, "complete", records.length, "records");
      return;
    }
    if (["FAILED", "TIMED-OUT", "ABORTED"].includes(current.status))
      throw new Error(
        `${platform} run ${current.status}. Inspect the run in Apify before starting another.`,
      );
    if (attempt % 3 === 0) console.log(platform, current.status);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error(
    `${platform} is still running. Run this command again to resume polling the saved run.`,
  );
}
// Ten profiles per LinkedIn run respects the actor's free-account run limit.
for (let i = 0; i < people.length; i += 10)
  await run(`linkedin-${i / 10 + 1}`, "harvestapi~linkedin-profile-scraper", {
    profileScraperMode: "Profile details no email ($4 per 1k)",
    urls: people.slice(i, i + 10).map((p) => p.linkedinUrl),
  });
const combined = Array.from({ length: Math.ceil(people.length / 10) }, (_, i) =>
  JSON.parse(fs.readFileSync(`data/private/linkedin-${i + 1}.json`, "utf8")),
).flat();
fs.writeFileSync(
  "data/private/linkedin.json",
  JSON.stringify(combined, null, 2),
);
await run("instagram", "apify~instagram-profile-scraper", {
  usernames: people.map((p) => new URL(p.instagramUrl).pathname.split("/")[1]),
  includeAboutSection: false,
});
console.log("Both permitted sources are saved privately. Next: npm run seed");
