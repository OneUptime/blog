# Validation Summary: How to Use Cypress Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cypress (E2E test framework)
- Cypress Dashboard / Cypress Cloud (test recording, analytics, parallelization service)
- GitHub Actions (`cypress-io/github-action@v6`)
- GitLab CI
- Sorry Cypress (open-source self-hosted alternative)
- Node.js / npm
- Mermaid diagrams (used in the markdown for illustration)

## Sources Consulted
- Cypress official docs — Cypress Cloud overview: https://docs.cypress.io/cloud/get-started/introduction
- Cypress rebrand announcement (Cypress Dashboard → Cypress Cloud, Nov 2022): https://www.cypress.io/blog/cypress-cloud-launching-new-cypress-product
- Cypress configuration reference (`defineConfig`, `e2e`, `video`, `videoCompression`, `screenshotOnRunFailure`, `retries`): https://docs.cypress.io/app/references/configuration
- `cypress run` CLI reference (`--record`, `--key`, `--parallel`, `--group`, `--tag`, `--ci-build-id`, `--spec`, `--config`): https://docs.cypress.io/app/references/command-line
- `CYPRESS_RECORD_KEY` environment variable: https://docs.cypress.io/cloud/account-management/projects#Record-key
- `cypress-io/github-action` v6 README: https://github.com/cypress-io/github-action
- Sorry Cypress project: https://github.com/sorry-cypress/sorry-cypress
- Cypress smart orchestration / load balancing: https://docs.cypress.io/cloud/features/smart-orchestration/parallelization

## Issues Found
1. **Outdated product name and URL.** The service was renamed from "Cypress Dashboard" to "Cypress Cloud" in November 2022, and the canonical URL changed from `dashboard.cypress.io` to `cloud.cypress.io` (the old URL still redirects).
   - **Fix:** Updated the opening paragraph to note the rebrand parenthetically, and changed the sign-up link from `dashboard.cypress.io` to `cloud.cypress.io`. Left the title and most prose using "Dashboard" intact because that is the explicit topic of the post and the author's chosen framing; only the factually outdated references were corrected.

## Review Notes
- The `cypress.config.js` snippets use the Cypress 10+ `defineConfig` API and current field names (`projectId`, `e2e`, `baseUrl`, `specPattern`, `video`, `videoCompression`, `screenshotOnRunFailure`, `screenshotsFolder`, `retries.runMode`, `retries.openMode`) — all correct.
- `videoCompression: 32` corresponds to the historical CRF default and is still accepted; readers on Cypress 13+ should note that the `video` default flipped to `false` (the post explicitly enables it, which is fine).
- All `cypress run` flags shown (`--record`, `--key`, `--parallel`, `--group`, `--tag`, `--ci-build-id`, `--spec`, `--config`) match the current CLI reference.
- The GitHub Actions example uses `actions/checkout@v4`, `actions/setup-node@v4`, and `cypress-io/github-action@v6`, all current at the time of review. The action's `record`, `parallel`, and `group` inputs are valid.
- The GitLab CI image tag (`cypress/browsers:node-20.9.0-chrome-118.0.5993.88-1-ff-118.0.2-edge-118.0.2088.46-1`) is an older but valid tag; teams may want to bump to a newer pinned tag of `cypress/browsers` over time.
- Flaky-test definition ("fails first attempt, passes on retry within the same run") matches Cypress's documented behavior.
- Sorry Cypress is accurately described as a self-hosted open-source alternative covering parallelization, recording, and basic analytics.
- The team-role names ("Owners / Admins / Members / Viewers") are illustrative; actual role names in Cypress Cloud have evolved, but the spirit is correct and not a code-level claim.
