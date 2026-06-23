# Validation Summary: How to Use Workflow Dispatch Inputs in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- `workflow_dispatch` manual triggers
- GitHub Actions workflow inputs
- GitHub Actions expressions and contexts
- GitHub Actions REST API
- GitHub CLI
- `actions/checkout`
- `actions/github-script`
- `softprops/action-gh-release`

## Sources Consulted
- GitHub Docs: Workflow syntax for GitHub Actions - `workflow_dispatch` inputs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs
- GitHub Docs: Manually running a workflow: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- GitHub Docs: REST API endpoints for workflows - Create a workflow dispatch event: https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
- GitHub Docs: Expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Docs: Contexts reference - `steps` context outcome and conclusion: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#steps-context
- GitHub CLI local help: `gh workflow run --help`
- `actions/checkout` README: https://github.com/actions/checkout
- `actions/github-script` README: https://github.com/actions/github-script
- `softprops/action-gh-release` README: https://github.com/softprops/action-gh-release

## Issues Found
- The input type reference omitted the supported `number` input type. Added a short `Number Input` example because GitHub documents `boolean`, `choice`, `number`, `environment`, and `string` as valid `workflow_dispatch` input types.
- The REST API example used older headers: `Authorization: token` and `Accept: application/vnd.github.v3+json`. Updated the example to use `Authorization: Bearer`, `Accept: application/vnd.github+json`, and `X-GitHub-Api-Version: 2026-03-10`, matching current GitHub REST API examples.
- The complete deploy example used `failure() && inputs.rollback_on_failure` after a step with `continue-on-error`. Because a failed `continue-on-error` step has `outcome: failure` but final `conclusion: success`, changed the rollback condition to check `steps.deploy.outcome == 'failure'`. The rollback step now exits with status 1 after rolling back so downstream notification reports the deploy job as failed instead of succeeded.

## Review Notes
- Several examples interpolate workflow inputs directly into shell commands. This is common in short examples, but production workflows should treat input values as untrusted and prefer constrained input types, environment variables, and careful quoting.
- Examples that push tags, create releases, or dispatch workflows may require explicit `permissions` such as `contents: write` or `actions: write` when a repository has restricted default `GITHUB_TOKEN` permissions.
