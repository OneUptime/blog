# Validation Summary: How to Use Job Outputs in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflow syntax, job outputs, `needs`, `strategy.matrix`, `fromJson`)
- `$GITHUB_OUTPUT` and `$GITHUB_STEP_SUMMARY` workflow command files
- Bash (heredoc, `jq`, `git`)
- Third-party actions: `actions/checkout@v4`, `dorny/paths-filter@v3`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v6`

## Sources Consulted
- Workflow syntax for GitHub Actions — https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- Workflow commands for GitHub Actions (GITHUB_OUTPUT, multiline values) — https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Evaluate expressions in workflows and actions (property dereference / dashes) — https://docs.github.com/en/actions/learn-github-actions/expressions
- GitHub docs issue #21529 — Clarify how multiline output values can be set via `GITHUB_OUTPUT` — https://github.com/github/docs/issues/21529
- Community discussion #17245 — Jobs need a way to reference all outputs of matrix jobs — https://github.com/orgs/community/discussions/17245
- Community discussion #26639 — Workflow job with needs output from matrix — https://github.com/orgs/community/discussions/26639
- cloudposse/github-action-matrix-outputs-write (matrix output workaround) — https://github.com/cloudposse/github-action-matrix-outputs-write

## Issues Found
1. **Multiline JSON written to `$GITHUB_OUTPUT` without delimiter syntax (JSON Outputs section).**
   The example built a multi-line `$MATRIX` value via a heredoc and then ran `echo "matrix=$MATRIX" >> $GITHUB_OUTPUT`. The `name=value` form only works for single-line values; a multi-line value makes GitHub fail with "Invalid format" because the continuation lines have no `name=` prefix. **Fix:** replaced the single `echo` with the documented heredoc-delimiter form (`echo "matrix<<EOF"` / `echo "$MATRIX"` / `echo "EOF"` grouped into `>> $GITHUB_OUTPUT`), which is the official way to set multiline outputs.

2. **Matrix Job Outputs section presented an unreliable pattern as working.**
   When a job uses `strategy.matrix`, all matrix instances share one set of job-level outputs. GitHub does not merge them per key — the last matrix job to finish overwrites the others, and the run order is not guaranteed, so distinct outputs like `api-image`/`web-image`/`worker-image` are not reliably populated downstream. This is a documented limitation. **Fix:** added a concise caveat after the code block explaining the overwrite behavior and pointing to the artifact-based workaround (and the `cloudposse/github-action-matrix-outputs-*` helpers). The example code was left in place as an illustration of the limitation rather than being restructured.

3. **Aggregating Results section had the same matrix limitation.**
   The `result-1`..`result-4` outputs from a single sharded matrix job suffer the identical overwrite problem. **Fix:** added a short note referencing the limitation and recommending artifacts for real aggregation.

## Review Notes
- Hyphenated and trailing-digit output names accessed via dot notation (`needs.build.outputs.api-image`, `needs.test.outputs.result-1`) are **valid**. The official expressions docs state a dereferenced property name must start with a letter or underscore and may contain alphanumerics, dashes, and underscores, so these were intentionally left unchanged.
- Action versions are all current as of the review date: `actions/checkout@v4`, `dorny/paths-filter@v3`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v6`.
- The post correctly uses the modern `$GITHUB_OUTPUT` file instead of the deprecated `::set-output::` workflow command, and the `${{ needs.test.outputs.passed && 'Passed' || 'Failed' }}` ternary-style expression and `needs.<job>.result` references are valid.
- The final reminder that "outputs are strings — use `fromJson()` for complex data" is accurate.
- Possible future improvement (not a correctness error): the matrix/aggregation examples could be rewritten end-to-end using the artifact-upload approach so readers have a fully working pattern rather than an illustrated caveat.
