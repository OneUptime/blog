# Validation Summary: How to Use Terraform CI/CD with Ephemeral Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform Time provider
- GitHub Actions
- GitHub CLI
- AWS IAM OIDC authentication for GitHub Actions
- AWS S3, ECS, Route 53, and Resource Groups

## Sources Consulted
- Terraform `replace` function: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform `timestamp` function: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform Time provider `time_static` resource: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/static
- Terraform S3 backend configuration: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform backend `-backend-config` syntax: https://developer.hashicorp.com/terraform/language/settings/backends/configuration
- Terraform `output -raw` command: https://developer.hashicorp.com/terraform/cli/commands/output
- GitHub Actions workflow syntax and permissions: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitHub Actions pull request events: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub OIDC in AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS configure-aws-credentials action: https://github.com/aws-actions/configure-aws-credentials
- HashiCorp setup-terraform action: https://github.com/hashicorp/setup-terraform
- GitHub REST API issue comments: https://docs.github.com/en/rest/issues/comments
- GitHub CLI `gh pr view`: https://cli.github.com/manual/gh_pr_view
- Terraform AWS provider `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_resourcegroups_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/resourcegroups_group

## Issues Found
- The Terraform example used `timestamp()` directly in resource tags for `CreatedAt`. Terraform documents that this changes every second and causes diffs on every run, so it was replaced with `time_static.created.rfc3339`.
- The integration-test health-check loop could continue to run tests after all health checks failed. Added a `HEALTHY` flag and an explicit `exit 1` if the environment never returns HTTP 200.
- The cleanup workflow used AWS OIDC authentication but did not grant `id-token: write`. Added `id-token: write`, `contents: read`, and `pull-requests: read` permissions.
- The cleanup workflow was described as TTL-based, but the code only destroyed environments for closed, merged, or unknown PRs. Added a 48-hour age check using the S3 state object's last-modified time.
- The cost-control section claimed spending limits and alerts, but the example only showed reduced sizing and resource-group tagging. Updated the wording to describe cost-tracking tags instead.

## Review Notes
The Terraform snippets are partial examples and reference resources/modules not defined in the post, such as the ECS cluster, task definition, security group, load balancer, Route 53 zone data source, and VPC module. That is acceptable for a focused blog example, but readers will need those surrounding definitions in a real implementation.
