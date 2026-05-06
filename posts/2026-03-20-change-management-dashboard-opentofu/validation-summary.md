# Validation Summary: How to Create a Change Management Dashboard for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Git
- GitHub Actions
- Bash
- jq
- Python
- HTML

## Sources Consulted
- OpenTofu documentation, Output Values: https://opentofu.org/docs/language/values/outputs/
- GitHub Docs, Workflow syntax for GitHub Actions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs, Use GITHUB_TOKEN for authentication in workflows: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub Docs, Skipping workflow runs: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs
- GitHub Docs, Variables reference: https://docs.github.com/en/actions/reference/workflows-and-actions/variables
- `actions/checkout` README: https://github.com/actions/checkout
- Python documentation, `html` module: https://docs.python.org/3/library/html.html
- jq 1.6 Manual: https://jqlang.org/manual/v1.6/

## Issues Found
- The Bash parser looked for separate `to add`, `to change`, and `to destroy` lines, but OpenTofu emits a single `Plan: X to add, Y to change, Z to destroy.` summary line. I changed the parser to match the documented OpenTofu output format.
- The Bash example built JSON with a heredoc containing raw Git metadata. Commit messages or author fields containing quotes could break the JSON. I changed the example to construct JSON with `jq -n`, `--arg`, and `--argjson` so the payload is safely encoded.
- The original `ci_run_url` fallback could produce malformed values such as `//actions/runs/` outside GitHub Actions. I changed the script to build the run URL only when the documented GitHub environment variables are present.
- The workflow example depended on repository write access but did not mention the required `permissions` setting. I added an inline note to set `contents: write`, removed the unused `GITHUB_TOKEN` environment variable, and clarified that `steps.apply.outcome` assumes the earlier apply step has `id: apply`.
- The Python dashboard inserted Git-derived strings directly into HTML. That could break markup or produce unsafe output when commit metadata contains special characters. I updated the example to use `html.escape(...)` and explicit UTF-8 file handling.
- The prose claimed the dashboard tracked approvals, but the implementation only collected Git metadata, plan counts, and CI run links. I corrected the description, introduction, and summary so they match what the code actually captures.

## Review Notes
- The `[skip ci]` commit message used in the workflow is supported for `push` and `pull_request` workflows, but GitHub notes that skipped required checks remain in a pending state on pull requests.
- The article still parses human-readable plan output rather than consuming a machine-readable plan JSON file. That is technically valid after the parser fix, but it remains more format-sensitive than a `tofu show -json` based approach.
