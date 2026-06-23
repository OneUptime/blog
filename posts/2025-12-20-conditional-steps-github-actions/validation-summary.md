# Validation Summary: How to Use Conditional Steps in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflow YAML, `if` conditionals)
- GitHub Actions expressions and contexts (`github`, `env`, `steps`, `needs`)
- GitHub Actions status check functions (`success()`, `failure()`, `always()`, `cancelled()`)
- `dorny/paths-filter` action (v3)
- Bash / shell scripting within `run` steps (`$GITHUB_OUTPUT`)

## Sources Consulted
- GitHub Actions — Contexts reference (context availability table): https://docs.github.com/en/actions/learn-github-actions/contexts
- GitHub Actions — Expressions / status check functions: https://docs.github.com/en/actions/learn-github-actions/expressions
- GitHub community discussion on conditional `env` usage: https://github.com/orgs/community/discussions/25725
- `dorny/paths-filter` action (v3): https://github.com/dorny/paths-filter

## Issues Found
1. **Step-level `env` referenced in the same step's `if` (Environment Variables in Conditions section).** The original example defined `HAS_API_KEY` in the step's own `env` block and then tested it in that same step's `if: env.HAS_API_KEY == 'true'`. This does not work: a step's `if` is evaluated before the step's own `env` is applied, so the `env` context in a step `if` only contains workflow-level and job-level variables, not variables defined in that same step. As written, the step would never run. Additionally, the `secrets` context is not available in a step-level `if`, so testing the secret directly in the `if` is not an option either.

   **Fix:** Moved the `HAS_API_KEY: ${{ secrets.API_KEY != '' }}` definition up to the job level (`jobs.build.env`), where it is in scope for the step's `if`. Added a short comment explaining why. The `if: env.HAS_API_KEY == 'true'` line is preserved and now works correctly.

## Review Notes
- All other examples were verified as correct:
  - Branch/event conditions (`github.ref`, `github.event_name`, `startsWith(...)`) are accurate.
  - The distinction between `steps.<id>.outcome` (used here with `continue-on-error: true`) and `conclusion` is correct — `outcome` reflects the actual result before `continue-on-error` is applied, which is what the success/failure branching needs.
  - Status functions `success()`, `failure()`, `always()`, and `cancelled()` are used correctly, including `always()` running even on cancellation.
  - Job-level conditions, `needs.<job>.result`, and the `always() && (...)` notify pattern are valid.
  - Actor-based checks (`github.actor`, `github.repository_owner`, `dependabot[bot]`, the `contains('["a","b"]', github.actor)` JSON-string-membership trick) are valid expression patterns.
  - `$GITHUB_OUTPUT` usage is the current (non-deprecated) syntax; the deprecated `::set-output` form is correctly avoided.
  - `dorny/paths-filter@v3` is a current, valid version.
- Minor stylistic note (not changed, not an error): the workflow_dispatch example uses `github.event.inputs.environment`; `inputs.environment` is the more modern equivalent, but both work.
