# Validation Summary: How to Build GitHub Actions Environment Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub Actions environment files: `GITHUB_ENV`, `GITHUB_OUTPUT`, `GITHUB_STEP_SUMMARY`
- GitHub Actions job outputs and reusable workflows
- GitHub Actions official actions: `checkout`, `setup-node`, `upload-artifact`, `download-artifact`
- YAML workflow configuration
- Bash shell commands
- Node.js and npm
- Jest/Istanbul coverage output

## Sources Consulted
- GitHub Docs: Workflow commands for GitHub Actions, including environment files, multiline strings, output parameters, and job summaries: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs: Store information in variables, including passing values between steps using `GITHUB_ENV`: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
- GitHub Docs: Passing information between jobs: https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/passing-information-between-jobs
- GitHub Docs: Workflow syntax for `workflow_call` inputs and outputs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Reusing workflows: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Store and share data with workflow artifacts: https://docs.github.com/en/actions/tutorials/store-and-share-data
- Official `actions/checkout` README: https://github.com/actions/checkout
- Official `actions/setup-node` README: https://github.com/actions/setup-node
- Official `actions/upload-artifact` README: https://github.com/actions/upload-artifact
- Official `actions/download-artifact` README: https://github.com/actions/download-artifact
- Node.js official releases page: https://nodejs.org/en/about/previous-releases
- Jest CLI documentation: https://jestjs.io/docs/cli
- Istanbul alternative reporters documentation for `json-summary`: https://istanbul.js.org/docs/advanced/alternative-reporters/

## Issues Found
- The workflow examples used older major versions of official GitHub actions. Updated `actions/checkout@v4` to `actions/checkout@v6`, `actions/setup-node@v4` to `actions/setup-node@v6`, `actions/upload-artifact@v4` to `actions/upload-artifact@v7`, and `actions/download-artifact@v4` to `actions/download-artifact@v8` to match current official action README examples.
- The Node.js examples used Node.js 18 and 20, which are end-of-life as of the validation date. Updated examples to use supported Node.js versions 22 and 24.
- The deployment summary example used a single-quoted heredoc delimiter, which prevents shell expansion of `$(date -u ...)`. Changed it to an unquoted heredoc so the timestamp command is evaluated as shown.
- The complete workflow parsed Jest/Istanbul coverage with `jq '.coverageMap.total.lines.pct' coverage/coverage-summary.json`, but Istanbul's `json-summary` output stores aggregate line coverage at `.total.lines.pct`. Updated the `jq` expression accordingly.

## Review Notes
- The core explanations of `GITHUB_ENV`, `GITHUB_OUTPUT`, job outputs, reusable workflow outputs, multiline delimiters, and `GITHUB_STEP_SUMMARY` match official GitHub documentation.
- The examples are Linux/Bash-oriented because they use `ubuntu-latest` and Bash syntax. Equivalent PowerShell syntax would be needed for Windows runner examples.
- `GITHUB_STEP_SUMMARY` content is isolated per step and has a documented per-step size limit; the post's advice to keep summaries focused is consistent with that limitation.
