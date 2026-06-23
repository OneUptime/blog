# Validation Summary: How to Debug 'Action timed out' Issues in GitHub Actions

## Status
validated

## Post Type
Guide / Tutorial (troubleshooting reference)

## Technologies Covered
- GitHub Actions (workflows, jobs, steps, `timeout-minutes`)
- GitHub CLI (`gh api`) and `jq`
- Workflow commands (`::group::`, `::warning::`, `$GITHUB_STEP_SUMMARY`)
- `actions/checkout@v4`, `actions/cache@v4`
- npm (`npm ci`, `--fetch-timeout`, `NODE_OPTIONS`)
- Jest CLI flags (`--detectOpenHandles`, `--forceExit`, `--testTimeout`, `--runInBand`)
- Service containers (PostgreSQL health checks, `pg_isready`)
- Linux/coreutils tooling (`timeout`, `free`, `df`, `ps`, `date`, `fallocate`/swap)

## Sources Consulted
- GitHub Actions usage limits & `timeout-minutes` — https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration (6-hour default job timeout)
- Workflow syntax (`jobs.<id>.timeout-minutes`, `steps[*].timeout-minutes`, `continue-on-error`, services) — https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions
- Workflow commands (grouping, warnings, step summary) — https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions
- actions/checkout (`fetch-depth`, `lfs`, `sparse-checkout`) — https://github.com/actions/checkout
- actions/cache — https://github.com/actions/cache
- npm config `fetch-timeout` (default 300000 ms) — https://docs.npmjs.com/cli/v10/using-npm/config#fetch-timeout
- Jest CLI options — https://jestjs.io/docs/cli
- jq manual (`fromdateiso8601`) — https://jqlang.github.io/jq/manual/
- Local verification of GNU `date -d` ISO 8601 parsing and bash arithmetic behavior

## Issues Found
1. **Broken timing arithmetic (real bug).** In the "Record timing" snippet, `DURATION=$((END_TIME - ${{ github.event.workflow_run.run_started_at }}))` performed bash integer arithmetic directly on `run_started_at`, which is an ISO 8601 timestamp string (e.g. `2026-01-01T00:00:00Z`), not epoch seconds. This produces a bash error (`value too great for base`), confirmed locally. Fixed by converting the timestamp to epoch seconds first with `START_TIME=$(date -d "${{ github.event.workflow_run.run_started_at }}" +%s)` and subtracting that.
2. **Misleading npm fetch-timeout example.** The "Increase timeouts for slow networks" example used `npm ci --fetch-timeout=300000`, but 300000 ms (5 minutes) is already npm's default value, so it does not actually increase anything. Changed to `--fetch-timeout=600000` so the example genuinely raises the timeout as the heading claims.

## Review Notes
- The 6-hour default job timeout claim is accurate for GitHub-hosted runners (`timeout-minutes` default of 360).
- The `gh api ... fromdateiso8601` timing example is correct; note that `completed_at` can be `null` for steps still in progress, which would make `fromdateiso8601` error for that step — fine in practice when run after the steps complete.
- Jest-specific flags (`--forceExit`, `--detectOpenHandles`, `--runInBand`, `--testTimeout`) assume the project uses Jest as its test runner; the post implicitly assumes this, which is reasonable for the npm-centric examples.
- The disk-cleanup snippet (`sudo rm -rf /usr/share/dotnet`, `/opt/ghc`, `docker system prune`) is a widely used pattern on `ubuntu-latest` runners and remains valid, though specific paths can change between runner images.
