# Validation Summary: How to Use terraform output -json for Machine-Readable Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform output values
- JSON
- jq
- Python
- Go
- Node.js
- GitHub Actions
- Ansible inventory generation
- Docker Compose environment files
- Kubernetes ConfigMaps

## Sources Consulted
- HashiCorp Terraform CLI command reference for `terraform output`: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform outputs tutorial, including sensitive outputs and JSON output behavior: https://developer.hashicorp.com/terraform/tutorials/configuration-language/outputs
- GitHub Actions workflow commands documentation for `GITHUB_OUTPUT`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- OneUptime linked post URL: https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-output-command-to-query-values/view
- Local tool checks for jq 1.7 behavior, Python 3.12.3 availability, and Node.js v22.22.0 availability

## Issues Found
- The `jq -r '.public'` map example showed compact single-line JSON for an array, but jq pretty-prints arrays by default. Changed the command to `jq -c '.public'` so the displayed output matches the command.
- The GitHub Actions example appended to `$GITHUB_OUTPUT` without quoting the path. Changed it to `"$GITHUB_OUTPUT"` to match GitHub's documented shell examples and avoid path-splitting issues.
- The generated `terraform.env` example wrote unquoted values and then sourced the file, which breaks for string outputs containing spaces or shell metacharacters. Changed it to generate a shell-safe file for string outputs using `@sh`.

## Review Notes
- Terraform behavior described in the post is consistent with HashiCorp documentation: `terraform output -json` returns all root outputs with `sensitive`, `type`, and `value` metadata, while `terraform output -json NAME` returns only the selected output value. HashiCorp also documents that `-json` and `-raw` display sensitive values in plain text.
- `terraform` and `go` were not installed in the local environment, so Terraform CLI behavior and Go syntax were verified against official documentation and language-level review rather than local execution.
