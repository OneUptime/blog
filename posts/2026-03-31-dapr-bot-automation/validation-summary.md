# Validation Summary: How to Use the Dapr Bot for Automation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Bot (`@dapr-bot`) — GitHub automation for the Dapr project
- Dapr CLI (install, init, run, list)
- GitHub Actions CI workflows
- GitHub CLI (`gh`)
- CODEOWNERS files

## Sources Consulted
- dapr/dapr repository `.github/scripts/dapr_bot.js` — actual bot command implementation
- dapr/cli repository `cmd/components.go` — `dapr components` command source (Kubernetes-only, `-k` flag required)
- dapr/cli repository `cmd/run.go` — `dapr run` command flags and syntax
- dapr/cli repository `pkg/standalone/standalone.go` — `dapr init` behavior (Redis on port 6379, Zipkin, placement service)
- dapr/cli repository default branch confirmed as `master` via GitHub API
- GitHub Actions `actions/checkout@v4` documentation

## Issues Found

### 1. 8 of 10 bot commands were fabricated (Critical)
**What was wrong:** The post listed 10 slash commands (`/ok-to-test`, `/assign`, `/assign @username`, `/lgtm`, `/approve`, `/hold`, `/unhold`, `/retest`, `/close`, `/cc @username`). Only `/ok-to-test` and `/assign` actually exist in the Dapr bot. The other 8 commands (`/lgtm`, `/approve`, `/hold`, `/unhold`, `/retest`, `/close`, `/cc`, `/assign @username`) are Prow/Kubernetes-ecosystem commands incorrectly attributed to Dapr's bot.

**What was changed:** Replaced the command list with the actual Dapr bot commands: `/ok-to-test`, `/assign`, `/ok-to-perf`, `/ok-to-perf-components`, `/test-sdk-all`, `/test-sdk-java`, `/test-sdk-python`, `/test-sdk-js`, `/test-sdk-go`, `/test-version-skew`.

### 2. `/assign` behavior incorrect (Major)
**What was wrong:** The post claimed `/assign` works on issues and PRs, and supports `/assign @username` to assign to others. In reality, `/assign` only works on issues (not PRs), only assigns the commenter to themselves, and does not accept a `@username` argument.

**What was changed:** Fixed the description to "Assign the issue to yourself (issues only)".

### 3. `/ok-to-test` scope inaccurate (Moderate)
**What was wrong:** The post claimed `/ok-to-test` triggers unit tests, integration tests, E2E tests, and linting. It actually only triggers E2E tests. Unit tests and linting run automatically via GitHub Actions on PR events.

**What was changed:** Updated to specify E2E tests and clarified that unit tests/linting run automatically.

### 4. Redundant Redis step would cause port conflict (Major)
**What was wrong:** The CI workflow ran `docker run -d -p 6379:6379 redis:7-alpine` after `dapr init`. Since `dapr init` already starts a Redis container on port 6379, this would fail with a port conflict.

**What was changed:** Removed the redundant Redis step.

### 5. `dapr components -k` incorrect for self-hosted CI (Major)
**What was wrong:** The workflow used `dapr components -k` to "validate components (Kubernetes)", but the workflow runs in self-hosted mode (via `dapr init`). The `dapr components` command only works in Kubernetes mode (`-k` is mandatory), and there is no Kubernetes cluster in this CI environment. The command would fail.

**What was changed:** Replaced with `dapr list` to verify the Dapr sidecar is running.

### 6. Review request section referenced non-existent `/cc` command (Major)
**What was wrong:** The "Requesting a Review" section used `/cc @dapr/maintainers` and `/cc @username`, which are not Dapr bot commands.

**What was changed:** Replaced with explanation that Dapr uses standard GitHub review requests and showed the `gh pr edit --add-reviewer` CLI alternative.

### 7. Bot status section referenced non-existent label workflow (Moderate)
**What was wrong:** The section claimed the bot manages "lgtm" and "approved" labels. The Dapr project uses standard GitHub pull request reviews, not bot-managed approval labels.

**What was changed:** Replaced with accurate description of bot status comments and `gh pr checks` command.

### 8. Label list included non-existent bot-managed labels (Moderate)
**What was wrong:** Listed `needs-review`, `lgtm`, and `approved` as bot-managed labels. These are Prow conventions not used by Dapr's bot.

**What was changed:** Reduced label list to confirmed labels (`size/*`, `do-not-merge`) and added note that approvals use standard GitHub reviews.

### 9. Summary referenced non-existent commands (Minor)
**What was wrong:** Summary mentioned `/lgtm` and `/retest` as example commands.

**What was changed:** Replaced with `/ok-to-test` and `/ok-to-perf`.

## Review Notes
- The Dapr bot also supports a `/make-me-laugh` command (posts a random joke), which was omitted from the corrected post as it is not relevant to automation workflows.
- The Dapr CLI install URL correctly uses `master` branch (`https://raw.githubusercontent.com/dapr/cli/master/install/install.sh`), confirmed via GitHub API.
- The `dapr run` command syntax in the workflow is correct.
- The CODEOWNERS file syntax and `gh pr view` command are correct.
- The `actions/checkout@v4` action reference is current.
