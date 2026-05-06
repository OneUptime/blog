# Validation Summary: How to Clean Up Stale Workspaces in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI workspaces
- OpenTofu S3 backend
- Bash
- AWS CLI and Amazon S3
- `jq`
- GitHub Actions

## Sources Consulted
- OpenTofu: Managing Workspaces - https://opentofu.org/docs/cli/workspaces/
- OpenTofu: `tofu workspace list` - https://opentofu.org/docs/cli/commands/workspace/list/
- OpenTofu: `tofu workspace select` - https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu: `tofu workspace delete` - https://opentofu.org/docs/cli/commands/workspace/delete/
- OpenTofu: `tofu destroy` - https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu S3 backend documentation - https://opentofu.org/docs/language/settings/backends/s3/
- AWS CLI `list-objects-v2` reference - https://docs.aws.amazon.com/cli/latest/reference/s3api/list-objects-v2.html
- AWS CLI environment variable and region configuration reference - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- OpenTofu GitHub Actions setup action README - https://github.com/opentofu/setup-opentofu
- OpenTofu latest release metadata - https://api.github.com/repos/opentofu/opentofu/releases/latest

## Issues Found
- The GitHub Actions install command used `https://github.com/opentofu/opentofu/releases/latest/download/tofu_linux_amd64.tar.gz`, but current OpenTofu release assets are versioned filenames such as `tofu_1.11.6_linux_amd64.tar.gz`, so the example URL does not resolve to a downloadable asset. I replaced that step with `opentofu/setup-opentofu@v2`, which is the documented setup action for GitHub Actions.
- The stale-workspace detection script hard-coded `terraform.tfstate` in a way that only matched one specific S3 backend key layout. OpenTofu documents non-default S3 workspace state paths as `workspace_key_prefix/workspace_name/key`, with `key` being user-configured. I parameterized both `PREFIX` and `STATE_KEY` and updated the filtering and workspace-name extraction logic to match the backend configuration.
- The script attempted to parse S3 `LastModified` timestamps with a macOS `date -j -f "%Y-%m-%dT%H:%M:%S"` fallback that does not match the AWS CLI timestamp format, which includes fractional seconds and a trailing `Z` (for example `2019-11-05T23:11:50.000Z`). I changed the parsing to use `jq` to normalize and convert the timestamp safely.
- `cleanup-workspace.sh` assigned `WORKSPACE="${1}"` while `set -u` was enabled. If the script is run without an argument, Bash exits before the custom validation message is printed. I changed that to `WORKSPACE="${1:-}"`.
- The workflow text said it would run the cleanup script weekly, and the step name said "Find and Destroy Stale Workspaces", but the snippet only runs the detection script. I renamed the prose and step name so they match the actual behavior.
- The workflow provided AWS credentials but no AWS region, even though AWS CLI documentation requires a region to be set explicitly or via default configuration. I added `AWS_REGION` to the example.
- The protected-workspace snippet used Bash regex matching for membership checks, which can mis-handle workspace names containing regex metacharacters. I changed it to a literal string match.

## Review Notes
- The S3 detection example is correct only when `PREFIX` matches `workspace_key_prefix` and `STATE_KEY` matches the backend `key` value for the target repository.
- The scheduled GitHub Actions workflow intentionally performs detection only. That is consistent with the post's safety guidance to keep destruction behind human review and approval.
