# Run, deploy, and submit Twofold

Follow this guide from the project root. You will deploy from your own Cloudflare account and record the video yourself. No live URL is claimed until the deployment and browser checks below succeed.

## 1. Prepare the project locally

Use Node.js **22.13 or later**. The local server uses Node's built-in SQLite module. If you already have the project folder, open a terminal there. For a clean clone:

```bash
git clone https://github.com/madaankartik/twofold-agentic-dating.git twofold
cd twofold
node --version
npm ci
cp .env.example .env.local
```

Skip the `cp` command if `.env.local` already contains your keys. Open that file in an editor and set:

| Name | Value |
| --- | --- |
| `APIFY_TOKEN` | Your Apify API token; the backend uses the LinkedIn and Instagram profile actors. |
| `GROQ_API_KEY` | Your Groq API key for profile analysis and separate agent calls. |
| `GROQ_MODEL` | Keep `openai/gpt-oss-120b` unless deliberately testing another compatible model. |
| `ADMIN_TOKEN` | A long random secret used to restore the public demo. Save it in your password manager. |

Create the tokens in your own provider accounts. Provider quotas and availability govern fresh imports and model dates. Do not assume that a successful cached demo means those accounts still have quota. This project does not buy credits or provision paid plans.

Start both servers:

```bash
npm run dev
```

Keep that terminal open. Visit **http://127.0.0.1:5173**. In another terminal, from the same project folder:

```bash
curl http://127.0.0.1:8787/api/health
npm run seed:check
npm run seed:import
```

The API applies the local migrations automatically. The demo check requires 25 ready profiles, complete four-turn dates with two assessments, valid citations, and at least two different date partners per person. It refuses partial files. The importer reads `ADMIN_TOKEN` from `.env.local`, writes batches of 20 records, then verifies readback. It does not scrape or regenerate the example. Refresh the page to see the restored cohort.

If `seed:check` fails, fix or finish the prepared data before recording. Do not substitute incomplete totals in the narration. The generation runner `npm run seed` requires fetched provider responses; it is not the portable restore command. The [README regeneration instructions](../README.md#regenerate-the-cohort-from-its-official-links) explain how to fetch those responses from the public `data/cohort.json` manifest and regenerate the example with your own provider quota.

## 2. Check the actual product

Run these checks before deploying:

```bash
npm run check
npm test
npm run build
```

Then use the browser:

1. Open **The people**, select a profile, and expand evidence from both platforms.
2. Open **The dates**, inspect a completed replay, and check the two verdicts.
3. Open **The matches**, select a person, and expand both a completed-date result and a preliminary comparison.
4. Add a new adult's matched official LinkedIn and public Instagram URLs that are not already cached. Keep the page open through extraction and analysis.
5. Start a new date with the new profile. Let four turns and two verdicts finish. Refresh and confirm the saved result and ranking adjustment remain.

The health flags `apify: true` and `groq: true` only confirm configuration. Step 4 tests source access; step 5 tests model calls. A failed source or model step should show its actual error and offer retry.

## 3. Configure your Cloudflare account

The included deployment uses **one Cloudflare Worker, Static Assets, and one D1 database**. The frontend and API share an origin. This avoids a separate frontend host and cross-origin cookie setup.

Run:

```bash
npx wrangler login
npx wrangler whoami
```

Complete the browser sign-in yourself and confirm the intended account. These are Wrangler's supported interactive authentication commands. If you have multiple accounts, set the intended `account_id` in `wrangler.jsonc`. [Cloudflare authentication commands](https://developers.cloudflare.com/workers/wrangler/commands/general/)

Open `wrangler.jsonc`. Its Worker name is `twofold`; change that now if you need a different name in your account. Keep the entry point `dist/server/index.js`, the compatibility date `2026-09-29`, and the `DB` binding name. The name and database ID are configuration; API tokens belong in secrets. [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

Create the database:

```bash
npm run db:create
```

Copy the **actual `database_id` UUID** from Wrangler's output into the `d1_databases` entry, replacing `00000000-0000-0000-0000-000000000000`. Retain `database_name: "twofold-db"`, `binding: "DB"`, and `migrations_dir: "drizzle"`. If Wrangler offers to edit the config automatically, inspect the result and avoid a duplicate binding. If that database already exists in your account, use `npx wrangler d1 list` to obtain its ID instead of creating another. [D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/)

The assets config serves `dist/client` directly and routes `/api/*` through the Worker first. The app uses hash routes such as `/#people`, so no custom domain or path rewrite is needed. [Static Assets routing](https://developers.cloudflare.com/workers/static-assets/binding/)

## 4. Add secrets, migrate, and deploy

Add each secret interactively. Paste its value only into Wrangler's secret prompt:

```bash
npx wrangler secret put APIFY_TOKEN
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put ADMIN_TOKEN
```

For `ADMIN_TOKEN`, use the same value as `.env.local` so the importer can authenticate. On the first command, Wrangler may offer to create the named Worker; accept only when the displayed name matches your config. The installed Wrangler supports creating a Worker when adding its first secret. The application code is uploaded by `npm run deploy` below. `secret put` publishes an updated Worker version when a Worker already exists. [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

Apply the checked-in migrations to the remote database:

```bash
npm run db:migrate:remote
```

Review and accept the migration prompt for the intended remote database. This applies the SQL files in `drizzle/`; it does not copy `data/local.db`. [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)

Build and deploy:

```bash
npm run deploy:check
npm run deploy
```

The first command builds and runs Wrangler's dry run; it does not publish. The second builds again and publishes the frontend and API. Copy the exact `https://...workers.dev` URL printed by Wrangler. If prompted to choose your account's workers.dev subdomain, complete that setup. Use the reported URL, not one guessed from the Worker name. [Worker deployment commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

## 5. Restore and verify the deployed demo

Replace `YOUR-ACTUAL-ORIGIN` below with the printed origin, without `/#people`, a path, or a trailing query:

```bash
curl https://YOUR-ACTUAL-ORIGIN/api/health
npm run seed:import -- --url https://YOUR-ACTUAL-ORIGIN
```

Expected health fields include `storage: true`, `apify: true`, `groq: true`, and `engine: "groq"`. Counts will be zero on a fresh database before import. The importer uses your local `ADMIN_TOKEN`; never place that token in command arguments or the URL. It refuses redirects, requires HTTPS for remote hosts, and verifies the saved records after import.

Open these URLs in a signed-out/private browser window:

| Purpose | URL |
| --- | --- |
| Saved example | `https://YOUR-ACTUAL-ORIGIN/#people` |
| Fresh-link entry | `https://YOUR-ACTUAL-ORIGIN/#add` |
| Health check | `https://YOUR-ACTUAL-ORIGIN/api/health` |

Confirm all 25 prepared profiles and the actual completed-date count. Open a profile, a date, and a ranking. Repeat the fresh-link and new-date checks from step 2 on the deployed origin. A local success alone does not verify deployment. The evaluator needs no keys: your server uses its configured secrets. New user-created records remain scoped to that browser session; the prepared demo is shared.

## 6. Verify the public repository

Use [madaankartik/twofold-agentic-dating](https://github.com/madaankartik/twofold-agentic-dating). Verify that the project files are at the repository root and its visibility is public. Use this existing repository for later updates.

Before pushing, inspect the files that will be included:

```bash
git status --short
git diff --cached --stat
```

Include source, package files, migrations, `wrangler.jsonc`, docs, and both completed compact demo JSON files. Exclude `.env.local`, `.dev.vars`, local SQLite files, provider dumps, `data/private/`, and raw research HTML. The checked-in `.gitignore` covers the standard local artifacts, but review the actual staged list and existing history too. Setting `private: true` in `package.json` only prevents accidental npm publication; the GitHub repository still needs **Public** visibility.

Open the GitHub URL while signed out. Follow the clean-clone instructions in step 1 in a separate folder once before submitting. Do not include API credentials in repository screenshots or the video.

## 7. Record and submit

Use the **2:45 script in [SUBMISSION.md](SUBMISSION.md)**. It leaves 15 seconds below the assignment's three-minute limit. Show profiles first, then actual agent dialogue, then rankings. Record at 1080p with readable text. Show a newly submitted pair of links and a newly generated response; label shortened waits and saved replay.

Upload the finished recording to YouTube yourself. Public or unlisted playback must work for someone without your account. Wait for processing, open the final link in a signed-out browser, and check the duration. Fill all four verified URLs and paste the two short text fields from the submission sheet.

## Updating a deployed version

Run `npm run check`, `npm test`, `npm run seed:check`, then `npm run deploy`. Apply `npm run db:migrate:remote` before deploying code that requires a new migration. Import again only when the prepared demo records changed. Imports upsert by ID and do not delete other user-created records. Changing `.env.local` does not change deployed secrets; use the corresponding `wrangler secret put` command.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `node:sqlite` is unavailable | Use Node 22.13+ and restart the terminal/server. |
| Demo validation refuses to import | Read the first validation issue. Both compact files must contain a complete, cited cohort and date run. |
| Import returns HTTP 401 | Match `ADMIN_TOKEN` in `.env.local` with the target server's secret; restart the local API after edits. |
| D1 reports `no such table` | Check the actual database ID and apply remote migrations to `DB`. |
| Build cannot find `assets.generated.json` | Use `npm run build`; its Worker build script creates the temporary asset manifest. |
| Scraping fails or waits at a provider step | Check the source URLs, public status, Apify actor access, and remaining quota. Retry the saved job. |
| A date waits or fails | A model rate limit displays a cooldown before resuming. For other failures, check Groq quota and model availability, then retry; completed turns remain saved. |
| A previously added pair skips extraction | This is a cache hit. Test fresh ingestion with a new valid pair. |
| Images disappear later | Source image URLs may expire; profiles fall back to initials. |
| Deployment health works but the browser is blank | Check that the build uploaded `dist/client`, then inspect the browser console and static asset responses. |
| Shared demo appears but a private test profile does not | Use the browser session that created it; session isolation is expected. |

Cloudflare configuration and command references above were checked on September 29, 2026. This guide does not promise uninterrupted provider availability or free usage beyond your accounts' available quotas.
