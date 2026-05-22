# Validation Summary: How to Handle Terraform with Distributed Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- AWS S3
- GitHub Actions
- actions/github-script
- hashicorp/setup-terraform
- Python
- Python zoneinfo
- YAML
- Slack, PagerDuty, Loom, Miro, Atlantis, and HCP Terraform/Terraform Cloud as collaboration tooling

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- AWS Prescriptive Guidance for Terraform backend best practices: https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/backend.html
- AWS provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- GitHub Actions workflow syntax and `GITHUB_TOKEN` permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/github-script documentation: https://github.com/actions/github-script
- hashicorp/setup-terraform documentation: https://github.com/hashicorp/setup-terraform
- Python `zoneinfo` documentation: https://docs.python.org/3/library/zoneinfo.html

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. HashiCorp now marks DynamoDB-based locking as deprecated for the S3 backend, so I changed the example to `use_lockfile = true`.
- The state-locking support example created a DynamoDB lock table and referenced a custom `Terraform/StateLocking` CloudWatch metric that Terraform does not emit by default. I replaced it with S3 bucket versioning and default server-side encryption resources, which match the current S3 lockfile backend approach and HashiCorp's state recovery recommendation.
- The GitHub Actions workflow ran Terraform without installing it. I added `hashicorp/setup-terraform@v3`, the official action for making the Terraform CLI available in GitHub Actions.
- The GitHub Actions workflow posted a PR comment without explicitly granting the `GITHUB_TOKEN` issue-comment permission. I added `contents: read` and `issues: write` to the workflow permissions.
- The `actions/github-script` example called `github.rest.issues.createComment` without awaiting the API call. I added `await` so the script waits for the comment request to complete.
- The Python reviewer-assignment example used fixed UTC offsets for named time zones, which is incorrect during daylight saving time changes. I changed it to use Python's standard `zoneinfo.ZoneInfo` with IANA time zone names.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`; the Terraform snippets were reviewed against current HashiCorp and AWS provider documentation.
- For pull requests from forks, GitHub typically downgrades write permissions on `GITHUB_TOKEN`, so the PR comment step may require repository settings, a separate commenting workflow, or another approved token strategy.
