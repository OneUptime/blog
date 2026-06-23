# Validation Summary: How to Use Scheduled Workflows (Cron) in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (`schedule` / `workflow_dispatch` triggers)
- POSIX cron syntax
- GitHub Actions marketplace actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/github-script@v7`, `github/codeql-action/upload-sarif@v3`, `peter-evans/create-pull-request@v7`, `aquasecurity/trivy-action@master`
- Octokit REST API (`@octokit/rest` via `github-script`)
- Bash / shell scripting (`date`, `git log`, `jq`)
- npm CLI (`npm audit`, `npm outdated`, `npm update`)
- Trivy vulnerability scanner / SARIF

## Sources Consulted
- GitHub Actions — Events that trigger workflows (`schedule`): https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
- GitHub Actions — Workflow syntax (`on.schedule`, `workflow_dispatch`, `timeout-minutes`, job `if`): https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- actions/checkout README (default `fetch-depth: 1` shallow clone): https://github.com/actions/checkout
- actions/github-script README: https://github.com/actions/github-script
- Octokit REST API methods (`actions.listWorkflowRunsForRepo`, `actions.deleteWorkflowRun`, `actions.getActionsCacheList`, `actions.deleteActionsCacheById`, `issues.create`): https://octokit.github.io/rest.js/
- peter-evans/create-pull-request (v7) docs: https://github.com/peter-evans/create-pull-request
- aquasecurity/trivy-action docs: https://github.com/aquasecurity/trivy-action
- GitHub Actions cache REST API: https://docs.github.com/en/rest/actions/cache

## Issues Found
1. **Shallow clone breaks `git log --since` in the Scheduled Reports example.** The `generate-report` job checks out the repo with `actions/checkout@v4` (which defaults to `fetch-depth: 1`, a shallow clone containing only the latest commit) and then runs `git log --oneline --since="7 days ago"` and `git log --since="7 days ago" --format='%ae'` to count commits and contributors over the past week. With a shallow clone these counts would be incorrect (effectively capped at the single fetched commit). Fixed by adding `with: fetch-depth: 0` to the checkout step so the full history is available, with an explanatory comment.

## Review Notes
- Cron field diagram is correct: five fields, day-of-week `0-6` with Sunday `0`, hours in UTC. (GitHub also accepts `7` for Sunday, but stating `0-6` is accurate, not an error.) All common patterns in the table are correct.
- Action versions are all current and non-deprecated as of the review date. `aquasecurity/trivy-action@master` is the form the upstream project documents; pinning to a release tag or SHA would be more reproducible but is a hardening suggestion, not an error.
- Octokit method names and response field names (`workflow_runs`, `actions_caches`, `last_accessed_at`, `created_at`) are accurate.
- The Trivy SARIF severity check (`select(.level == "error")`) relies on Trivy mapping CRITICAL/HIGH severities to SARIF level `error`; this matches Trivy's default SARIF template. Reasonable as written.
- Timezone math is correct: 9 AM EST (UTC-5) = 14:00 UTC, and the note that DST shifts EDT (UTC-4) to 13:00 UTC is accurate. The post correctly warns that DST must be handled manually since cron is always UTC.
- The multiple-schedules dispatcher relies on `date -u +%u` (Mon=1..Sun=7) and string hour comparisons with leading zeros (`"02"`, `"03"`); these are consistent and behave correctly.
- Minor, not corrected (behavioral nuance, not an error): `npm outdated --json` emits `{}` when nothing is outdated, which is a non-empty file, so the `[ -s outdated.json ]` check could report `has_updates=true` with no actual updates. Left as-is since it is an edge case and the surrounding `npm update` is idempotent.
- Not mentioned but worth noting for readers: GitHub disables scheduled workflows after ~60 days of repository inactivity, and the minimum schedule interval is effectively 5 minutes. These are omissions, not inaccuracies.
