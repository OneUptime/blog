# Validation Summary: How to Use Terragrunt for Feature Branch Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- AWS S3 remote state
- AWS CLI
- GitHub Actions
- GitHub REST API via actions/github-script
- Bash

## Sources Consulted
- Terragrunt HCL functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions workflow syntax and pull request event documentation: https://docs.github.com/en/actions/reference/events-that-trigger-workflows
- GitHub REST API issue comments documentation: https://docs.github.com/v3/issues/comments
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- AWS CLI `s3api list-objects-v2` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-objects-v2.html
- AWS CLI `s3 rm` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/rm.html

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform now documents DynamoDB-based locking as deprecated, so the example was changed to `use_lockfile = true`.
- The Terragrunt workflow examples used the older `run-all` command and `--terragrunt-non-interactive` flag. Terragrunt's current CLI documents `terragrunt run --all` and `--non-interactive`, so the commands were updated.
- The GitHub Actions workflow used OIDC-style AWS role assumption and PR comments without declaring token permissions. Added `id-token: write`, `contents: read`, and `pull-requests: write`.
- The TTL tag example used `timestamp()` directly in resource tags, which Terraform documents as causing recurring diffs. Replaced it with a stable `ENV_CREATED_AT` value from the pull request payload.
- The stale-environment cleanup script attempted to infer stale environments from `aws s3 ls` prefix output, which does not reliably provide object timestamps for pseudo-directory prefixes. Replaced it with `aws s3api list-objects-v2` over actual `terraform.tfstate` objects and extracted unique environment prefixes.

## Review Notes
- Local Terraform, Terragrunt, and AWS CLIs were not installed in the review environment, so CLI behavior was verified against official documentation rather than local `--help` output.
- The GitHub Actions example can still need repository-specific adjustments for forked pull requests because GitHub may downgrade write permissions on `pull_request` workflows from forks.
