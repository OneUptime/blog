# Validation Summary: How to Build GitHub Actions Workflow Commands

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- GitHub Actions workflow commands
- GitHub Actions environment files (`GITHUB_OUTPUT`, `GITHUB_ENV`, `GITHUB_PATH`, `GITHUB_STEP_SUMMARY`, `GITHUB_STATE`)
- GitHub Actions annotations and log grouping
- GitHub Actions masking
- GitHub Actions job outputs and matrix builds
- Bash shell scripting
- Node.js and npm in GitHub Actions
- `actions/checkout` and `actions/setup-node`

## Sources Consulted
- GitHub Docs: Workflow commands for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs: Store information in variables - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Blog Changelog: Deprecating save-state and set-output commands - https://github.blog/changelog/2022-10-10-github-actions-deprecating-save-state-and-set-output-commands/
- `actions/checkout` official repository - https://github.com/actions/checkout
- `actions/setup-node` official repository - https://github.com/actions/setup-node
- GitHub Docs: Building and testing Node.js - https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs

## Issues Found
- The semantic version bump example used `git log $LATEST_TAG..HEAD` even when `LATEST_TAG` fell back to the nonexistent `v0.0.0` tag. I changed it to use the tag range only when the tag exists, and otherwise inspect `HEAD`.
- The semantic version bump example tried to read `${{ steps.bump.outputs.bump_type }}` inside the same step that sets the output. GitHub Actions expressions are evaluated before the step runs, so this would not work as intended. I changed the summary line to use a shell variable set during the script.
- The matrix build examples used older major versions of `actions/checkout` and `actions/setup-node`. I updated them to the current official examples using `actions/checkout@v6` and `actions/setup-node@v6`.
- The Node.js matrix included Node 18, which is outdated for a 2026 workflow example. I updated the example matrix to current supported versions, Node 22 and Node 24.
- The dynamic masking example masked a generated value and then stored it as a step output. To keep the example focused on same-job reuse without conflicting with masking guidance, I changed it to write the generated token to `GITHUB_ENV` and read it in a later step.
- The state management section described `GITHUB_STATE` as step-to-step workflow state. GitHub documents `GITHUB_STATE` as available only within an action for sharing values with that action's `pre` and `post` scripts. I replaced the workflow-step example with a custom action JavaScript example.
- The error handling example used a pipeline with `tee` but captured `$?`, which would report the status of `tee` rather than `npm run build`. I added `set -o pipefail` so the build failure is detected correctly.
- The command reference claimed to list all workflow commands, but it listed only common commands. I changed the wording to "commonly used workflow commands."

## Review Notes
The remaining examples are intentionally illustrative and assume standard Linux GitHub-hosted runners with Bash, npm, `jq`, and `bc` available where used. For production workflows, examples that insert dynamic values into environment files should use unique multiline delimiters when values may contain arbitrary user-controlled content.
