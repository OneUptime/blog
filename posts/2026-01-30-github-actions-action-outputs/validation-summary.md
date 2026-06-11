# Validation Summary: How to Create GitHub Actions Action Outputs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions workflows
- GitHub Actions step outputs and job outputs
- GitHub Actions action metadata (`action.yml`)
- Composite, JavaScript, Docker, and reusable GitHub Actions
- Bash
- jq
- Kubernetes `kubectl` deployment image updates

## Sources Consulted
- GitHub Docs: Workflow commands for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs: Metadata syntax reference - https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- GitHub Docs: Passing information between jobs - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs
- GitHub Docs: Reuse workflows - https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Blog: Deprecating save-state and set-output commands - https://github.blog/changelog/2022-10-10-github-actions-deprecating-save-state-and-set-output-commands/
- jq Manual - https://jqlang.org/manual/

## Issues Found
- The matrix output explanation said outputs from the last completed matrix job are used. GitHub documents that matrix job order is not guaranteed and that the last matrix job that runs overrides a shared output name. Updated the wording to reflect that behavior.
- The JSON output example used `jq -n`, which pretty-prints JSON by default. That can produce a multiline value and break the `name=value` format written to `GITHUB_OUTPUT`. Changed it to `jq -c -n` so the JSON is compact and written as a single-line output.
- The best practices section said output size limits are 1 MB per output. GitHub documents a 1 MB per job limit and a 50 MB per workflow run limit. Updated the limit text.

## Review Notes
The remaining GitHub Actions examples align with current environment-file output syntax, action metadata output declarations, job output mapping through `needs`, and reusable workflow output mapping. The Docker scanner commands are illustrative placeholders and assume a `run-scanner` command exists in the action image.
