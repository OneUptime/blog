# Validation Summary: How to Debug GitHub Actions Workflow Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, debug logging, contexts, annotations, job summaries, matrix builds)
- GitHub Actions marketplace actions: `actions/upload-artifact@v4`, `mxschmitt/action-tmate@v3`, `nick-fields/retry@v3`
- Bash scripting (retry loops, process monitoring, resource checks)
- Node.js / npm tooling (`NODE_OPTIONS`, `npm ci`, `npm test`)

## Sources Consulted
- GitHub Docs — Enabling debug logging: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows/enabling-debug-logging
- GitHub Docs — Workflow commands for GitHub Actions (`::group::`, `::error::`, `::warning::`, `$GITHUB_STEP_SUMMARY`): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Docs — Contexts (`github`, `job`, `steps`, `runner`, `toJSON`): https://docs.github.com/en/actions/learn-github-actions/contexts
- actions/upload-artifact (v4): https://github.com/actions/upload-artifact
- mxschmitt/action-tmate (v3, `limit-access-to-actor`): https://github.com/mxschmitt/action-tmate
- nick-fields/retry (v3): https://github.com/nick-fields/retry

## Issues Found
- **Incorrect method to enable step debug logging for a single run.** The post claimed you could enable step debug logging by setting a job/workflow `env:` value (`ACTIONS_STEP_DEBUG: true`). Per the official GitHub docs, step debug logging is read from a repository **secret or variable**, not from a job/workflow `env:` value, so this snippet would not work. Replaced the incorrect `env:` snippet with an accurate note explaining that step debug logging comes from a repository secret/variable, and that the documented way to enable it for a single run is to re-run the workflow with debug logging enabled (covered in the next section).
- **Runner diagnostic logging described as secret-only.** The post stated `ACTIONS_RUNNER_DEBUG` must be added as a "secret." Per the docs, it can be set as either a secret **or** a variable. Updated the wording to "repository secret (or variable)" for accuracy (and likewise clarified `ACTIONS_STEP_DEBUG` as "repository variable (or secret)").

## Review Notes
- All referenced marketplace actions and their major version tags are current and valid: `actions/upload-artifact@v4`, `mxschmitt/action-tmate@v3` (including the `limit-access-to-actor` input), and `nick-fields/retry@v3` (with `timeout_minutes`, `max_attempts`, `command` inputs).
- Workflow commands (`::group::`/`::endgroup::`, `::error::`, `::warning::`), the `$GITHUB_STEP_SUMMARY` file append pattern, context dumping via `toJSON()`, matrix strategy with `fail-fast: false`, and `NODE_OPTIONS="--max-old-space-size=4096"` are all syntactically correct and current.
- The bash snippets (retry `for` loop, `kill -0 $PID` process-liveness check, `tee` log capture, `df -h`/`free -h`) are correct.
- Minor caveat (not corrected, as it is a stylistic/edge concern, not an error): `free -h` is Linux-specific and would not work on `macos`/`windows` runners; the resource-check example implicitly assumes a Linux runner, which is the common default.
