# Validation Summary: How to Review Terraform Plan Output in Pull Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform plan output
- Terraform JSON plan format
- GitHub Actions
- actions/github-script
- Python
- jq

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- GitHub Actions workflow syntax and `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub REST API issue comments endpoint: https://docs.github.com/en/rest/issues/comments#create-an-issue-comment
- actions/github-script documentation: https://github.com/actions/github-script
- Terraform CLI releases: https://github.com/hashicorp/terraform/releases

## Issues Found
- The workflow code block used a four-backtick opening fence but a three-backtick closing fence, causing the Markdown to render incorrectly until a later fence. Fixed the workflow closing fence and the following destructive-change snippet fence.
- The GitHub Actions workflow did not declare `GITHUB_TOKEN` permissions for creating a pull request comment. Added `contents: read` and `pull-requests: write`, matching GitHub's documented permissions for pull request issue comments.
- The workflow used Terraform `1.7.0`, while the current stable Terraform CLI release is `1.15.4`. Updated the pinned example version.
- The plan command piped Terraform output through `tee` without explicitly enabling `pipefail`. Added `set -o pipefail` so Terraform plan failures are not masked by the pipeline.
- The `github-script` step used an older action version and did not await the comment API call. Updated the example to `actions/github-script@v9` and added `await`.
- The post recommended targeted plans as a general way to break down large plans. Terraform documentation says `-target` is for exceptional circumstances and is not recommended for routine use. Adjusted the wording and added that caveat.

## Review Notes
The remaining Terraform CLI flags and examples (`-no-color`, `-out`, `terraform show -json`, `-var-file`, and JSON `resource_changes[].change.actions`) match official Terraform documentation. The risk assessment script is intentionally simple and technically valid, but production use should account for provider-specific resource types, action order, and organization-specific risk rules.
