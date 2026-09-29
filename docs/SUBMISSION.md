# Twofold submission

## Links

Replace each pending value only after opening the final link in a signed-out browser. Do not submit local addresses or guessed deployment URLs.

| Deliverable | Verified link |
| --- | --- |
| YouTube video, no longer than 3:00 | Pending upload and playback verification |
| Finished example / demo | Pending deployment verification; use the deployed origin plus `/#people` |
| Working website | Pending deployment verification; use the deployed origin plus `/#add` for fresh-link entry |
| Public GitHub repository | Pending public repository verification |

The demo and live site share the same application. The prepared cohort is read-only; fresh profiles and dates are isolated to the evaluator's browser session.

## Overall explanation

Paste this into the field with the 200-character limit:

> Twofold turns LinkedIn and public Instagram into evidence-backed agents. They negotiate simulated dates, assess each other independently, and explain a directional ranking for every person.

## Technical section

Paste this into the field with the 500-character limit:

> TypeScript/Hono uses Apify's HarvestAPI LinkedIn Profile Scraper and Instagram Profile Scraper, without email enrichment. Public HTML/JSON-LD and Instagram embed parsing provide a fallback. Identity and privacy checks gate analysis. SQLite/D1 stores cited evidence; Groq runs separate agents. The UI uses React, Vite and custom CSS.

## What this demonstrates

- At least 25 real adults, each represented by two matched official accounts.
- Profile analysis before rankings, with evidence available beside each observation.
- Exactly two biographical sources: the person's LinkedIn and Instagram.
- Separate agents that propose, respond, adapt, and make independent assessments.
- A baseline of 25 completed dates, two partners per person, and 600 directional ranking entries.
- A working fresh-link flow in the deployed application.

The baseline includes 25 of the 300 possible unordered pairs. Undated pairs receive preliminary profile comparisons and are visibly marked **Not yet met**. Do not describe this as 300 completed dates.

## Video plan: 2 minutes 45 seconds

Record the real application. Use a completed, evidence-rich conversation with a visible adaptation for the replay, and show a newly generated date as part of the live flow. Time cuts may remove provider waiting, but label them **“Extraction wait shortened”** or **“Generation wait shortened.”** Never relabel saved replay as live generation.

Keep browser text large enough to read at 1080p. Use one clean window and hide tokens, dashboards containing secrets, notifications, and unrelated tabs.

| Time | On screen | Suggested narration |
| --- | --- | --- |
| **0:00–0:12** | Open **The people**. Show the real cohort count and completed date count. | “This is Twofold. Every person has an agent built from exactly two sources: their LinkedIn and public Instagram. These are real profiles; the conversations are simulations.” |
| **0:12–0:35** | **Add a person**: paste two official links not already in the cohort. Submit; show real progress and the resulting profile. Shorten only the waiting interval. | “Two official links go in. The backend reads both sources, checks that Instagram is public and the identities match, then saves the analysis. A source failure stays visible and can be retried.” |
| **0:35–1:00** | Open one strong prepared profile. Expand two different evidence-backed observations, showing both platforms. Show the Needs section. | “Each observation has evidence and a confidence label. Here is the LinkedIn observation; here is the Instagram caption. The agent can identify supported interests. It keeps actual relationship needs and preferences unknown.” |
| **1:00–1:12** | Return to the cohort, scroll through the 25 people, briefly show **How it works** counts. | “The prepared example has 25 people. Every agent has two completed dates. Each person is ranked against the other 24: 600 directional comparisons.” |
| **1:12–1:52** | **The dates**: show a short saved replay clearly labeled as saved, highlighting a proposal and adaptation. Start a new date and show a real new response. Cut a wait if needed. | “One agent proposes an activity from its evidence. The second has its own context and responds. The first then adapts to that reply. These are separate model calls, and each agent makes its own assessment after the conversation.” |
| **1:52–2:18** | Reveal the two verdicts. Open the first person's matches, expand the relevant pair and its score breakdown, then show the reverse ranking. | “The conversation adds a bounded adjustment to the profile fit. The two agents can disagree, so A's ranking of B can differ from B's ranking of A. You can open the transcript behind the result.” |
| **2:18–2:35** | Expand an undated comparison. Show **Not yet met**, preliminary score, and unknowns. | “There are 300 possible pairs. This run completes 25 dates and covers every person twice. The remaining comparisons are labeled preliminary; we don't pretend those agents have already met.” |
| **2:35–2:45** | Show the live site, saved demo entry point and public repo. End on the product. | “The saved cohort is ready to inspect, and you can paste your own public links and run another date. The source adapters, prompts, scoring and tests are in the public repository.” |

The counts in this narration are release requirements. Record them only after the actual saved run meets them. If you add a new person while filming, explain that the original saved cohort contains 25 and that the live demonstration adds another.

### Choose the strongest conversation

Before recording, inspect the completed transcripts and select one that contains:

1. A concrete proposal tied to source evidence.
2. A response that adds a different interest or constraint within the simulation.
3. An actual change or refinement in the proposal.
4. Independent verdicts with specific reasons and a visible ranking adjustment.

Do not fabricate a disagreement or claim a ranking changed if the displayed score did not change. If a generated conversation is bland, generate another supported scenario and use the real saved result.

## Final verification checklist

### Cohort and data

- [ ] At least 25 ready profiles, each with one official LinkedIn and one matched public Instagram account.
- [ ] Both source platforms have readable evidence for every person.
- [ ] Every Instagram account has explicit public-account evidence; a visible bio alone does not count.
- [ ] All participants are adults; ambiguous identity pairs are excluded.
- [ ] Every stated interest, hobby, or priority has a valid evidence reference.
- [ ] Generated dialogue is labeled as simulation; intimate preferences and availability are not invented.
- [ ] Exactly 25 distinct prepared dates completed; every original person appears in two different pairs.
- [ ] Each completed date contains four turns and two independent assessments.
- [ ] Each original person has 24 ranking entries, excluding themselves: 600 total.
- [ ] Undated pairs are explicitly distinguished from completed dates.

### Working site

- [ ] Fresh official links, not just a cached pair, produce a profile on the deployed site.
- [ ] A new date generates responses and assessments and affects the applicable ranking.
- [ ] Reopening or refreshing a saved profile and date preserves their results.
- [ ] A malformed URL and a private/unavailable profile produce useful errors.
- [ ] A failed step retains progress and its retry control works.
- [ ] Search, filters, original-source links, replay, speed control and ranking expansion work.
- [ ] The demo works signed out and without API keys entered by the evaluator.
- [ ] Provider accounts have enough remaining quota for evaluation; displayed configuration flags alone do not verify this.

### Delivery

- [ ] `npm run check`, `npm test`, and `npm run build` pass on the release revision.
- [ ] A clean clone can restore both compact demo files using the README command.
- [ ] The GitHub repository is public and opens without signing in.
- [ ] Secrets, raw source dumps, provider run dumps and local databases are excluded from Git history.
- [ ] The demo and website links open in a signed-out browser.
- [ ] YouTube has finished processing; the uploaded video plays and is at most 3:00.
- [ ] Profiles appear before rankings in the video; real generated agent dialogue is shown.
- [ ] Any shortened waits and saved replays are labeled honestly.
- [ ] The final submission fields contain verified URLs and fit their character limits.

## Known boundaries to explain accurately

The fit index is a transparent heuristic, not a prediction that two people will form a relationship. Public posts can reveal interests but often cannot establish personal needs. Identity matching is a source consistency check, not an identity-verification service. The live form requests adults but does not prove age.

Direct scraping depends on source access and page structure; Apify and model calls depend on configured provider availability and quota. Failed extraction does not become fictional evidence. Job advancement is driven by the open browser and is resumable; it is not a continuously running background queue.

The original cohort-generation scripts require excluded research/provider files. The portable public demonstration is restored from the compact checked-in demo records. The README documents both paths separately.
