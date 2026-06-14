# Validation Summary: How to Use Workflow Conditions in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflow syntax
- GitHub Actions expressions and contexts
- GitHub Actions job and step conditionals
- GitHub Actions path filters
- GitHub Actions workflow commands and job outputs
- dorny/paths-filter GitHub Action

## Sources Consulted
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: Evaluate expressions in workflows and actions - https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Docs: Using conditions to control job execution - https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions
- GitHub Actions runner ADR: Step outcome and conclusion - https://github.com/actions/runner/blob/main/docs/adrs/0274-step-outcome-and-conclusion.md
- GitHub Marketplace: Paths Changes Filter - https://github.com/marketplace/actions/paths-changes-filter
- GitHub Marketplace: Upload a Build Artifact - https://github.com/marketplace/actions/upload-a-build-artifact

## Issues Found
- The path-based trigger example used both `paths` and `paths-ignore` under the same `push` event. GitHub workflow syntax does not allow both filters for the same event, so I changed the ignored patterns to negative `paths` patterns using `!`.
- The `dorny/paths-filter` example used `dorny/paths-filter@v2`. The current Marketplace documentation recommends `dorny/paths-filter@v4`, so I updated the example to `@v4`.
- The failure notification step followed a test step with `continue-on-error: true` but used `failure()`. A continued failed step has `steps.<id>.outcome == 'failure'` while its final conclusion is success, so I changed the condition to `steps.tests.outcome == 'failure'`.

## Review Notes
The remaining examples are technically valid as illustrative workflow snippets. Pull request and label conditions assume the workflow is running for a pull request event; in a multi-event workflow, adding `github.event_name == 'pull_request'` guards would make those examples safer.
