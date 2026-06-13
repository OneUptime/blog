# Validation Summary: How to Define Job Dependencies in GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions workflow YAML
- GitHub Actions job dependencies with `needs`
- GitHub Actions job outputs and `$GITHUB_OUTPUT`
- GitHub Actions artifact upload/download actions
- GitHub Actions matrix strategies and reusable workflows
- Shell commands used in workflow steps (`git diff`, `grep`, `cut`, `sort`, `jq`, `docker build`)

## Sources Consulted
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Passing information between jobs - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs
- GitHub Docs: Workflow commands for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs: Running variations of jobs in a workflow - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations
- GitHub Docs: Reuse workflows - https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions: actions/upload-artifact README - https://github.com/actions/upload-artifact
- GitHub Actions: actions/download-artifact README - https://github.com/actions/download-artifact

## Issues Found
- The "Using Job Outputs" example used `git diff HEAD~1` after the default `actions/checkout@v4` checkout. The default checkout fetches only one commit, so `HEAD~1` may not exist. Added `fetch-depth: 2` to make the previous commit available.
- The "Dynamic Dependencies with Matrix" example could fail when no files under `services/` changed because `grep "^services/"` returns a non-zero exit code. Split the command so the grep stage uses `|| true`, allowing the example to produce `[]` and let the existing job-level `if` skip the matrix job.

## Review Notes
The examples are partial workflow snippets and assume repository-specific scripts such as `npm run build`, `./deploy.sh`, and `./deploy-all.sh` exist. The artifact, matrix, reusable workflow, output, `needs`, and status-check examples match GitHub Actions syntax and documented behavior.
