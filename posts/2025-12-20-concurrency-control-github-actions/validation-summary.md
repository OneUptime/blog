# Validation Summary: How to Use Concurrency Control in GitHub Actions

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- GitHub Actions (workflow and job-level concurrency)
- YAML workflow syntax
- GitHub Actions expressions and context (`github.ref`, `github.event_name`, `github.event.pull_request.number`, `github.workflow`)
- `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `actions/github-script@v7`
- Octokit REST API (`github.rest.actions.listWorkflowRuns`)
- npm CLI

## Sources Consulted
- GitHub Actions — Concurrency: https://docs.github.com/en/actions/using-jobs/using-concurrency
- GitHub Actions — Workflow syntax (`concurrency`, `jobs.<job_id>.concurrency`, `strategy.max-parallel`): https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions — Expressions (`startsWith`, `format`, status check functions `cancelled()`, `failure()`, `always()`): https://docs.github.com/en/actions/learn-github-actions/expressions
- actions/github-script: https://github.com/actions/github-script
- Octokit REST — Actions.listWorkflowRuns: https://octokit.github.io/rest.js/
- npm CLI docs (`npm run-script`): https://docs.npmjs.com/cli/v10/commands/npm-run-script

## Issues Found
- **`npm build` is not a valid npm command** (line 127, "Different Strategies Per Branch" example). npm has no `build` subcommand; running a package's build script requires `npm run build`. Changed `npm ci && npm build` to `npm ci && npm run build`. This is consistent with the "Complete Example" later in the post, which correctly uses `npm run build`.

## Review Notes
- Workflow-level and job-level `concurrency` blocks, `cancel-in-progress` (including expression-valued forms), and `strategy.max-parallel` are all valid and current.
- The conditional concurrency group expression using `startsWith(...) && '...' || format('release-{0}', github.ref)` is syntactically correct GitHub Actions expression syntax.
- Action versions referenced (checkout@v4, setup-node@v4, upload/download-artifact@v4, github-script@v7) are current as of the review date.
- The `github.rest.actions.listWorkflowRuns` call with `owner`, `repo`, `workflow_id`, and `status: 'queued'` parameters is a valid Octokit usage, and `core.warning` is a correct toolkit method.
- No other technical issues found.
