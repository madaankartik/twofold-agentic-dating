# Release validation

## Application checks

- TypeScript type checking and the production build pass.
- 29 automated tests cover URL/identity checks, source extraction, scoring, independent agent contexts, citations, duplicate dialogue, and saved rate-limit recovery.
- API smoke checks pass for all 25 profiles and 600 directional rankings, rejected inputs, completed conversations, and session isolation.
- A genuinely new Drew Binsky profile was read from the two official sources using Apify, analyzed using Groq, saved, and reloaded. Another browser session could not read its job, profile, or rankings.
- A separate date was created through the mobile browser interface and completed four turns and two independent assessments. Replay pause/resume and navigation into its participant's rankings were exercised.
- The layout was checked at a 390-pixel mobile viewport; the people, profile, and rankings views did not overflow horizontally.

## Deployment package

The Worker bundle passes Wrangler's deployment dry run. The generated application was also run locally under Wrangler with an isolated D1 database and Static Assets. Its migrations applied, the 25-person/25-date example imported in bounded batches, and the importer verified readback. Same-origin profile submission was exercised in that built application.

The user is deploying the final release. These checks do not claim that a user-owned production deployment has been verified. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy and check the final public URL.

## Data verification

`data/demo-verification.json` is produced by `npm run verify:demo` from the local database. It checks:

- 25 ready people and exactly the two permitted source platforms.
- 25 distinct completed pairs, with two different partners per person.
- Four turns and two verdicts per date.
- 24 rankings for every person.

`npm run seed:check` independently validates the exported records and citation references before they can be imported. Reference validation does not establish that every generated sentence is a perfect semantic reading of its source; the interface links to original evidence for inspection.

## Dependency check

The production dependency audit reports **0 advisories**. The release removes the high-severity Drizzle ORM identifier-escaping advisory by updating the schema tooling to 0.45.3. Migration generation reports no schema change.

Seven moderate advisories remain in development-only dependency chains: Drizzle-kit embeds an older esbuild, and Wrangler/Miniflare pins an undici version with a WebSocket compression advisory. Compatible updates did not remove those pins. No forced dependency downgrade or unverified override was applied. Neither chain is included as an application dependency in the deployed Worker.

## Provider limits

Fresh reads and live dates depend on the configured Apify/Groq accounts. Saved profiles, dates, and rankings remain available without another model or scraper call. Groq rate limits save a retry deadline and resume automatically; source failures remain explicit and can be retried. Provider availability and free-tier limits can change.
