# Validation Summary: How to Audit Terraform Access and Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI and HCL
- Terraform S3 backend
- GitHub branch protection with the Terraform GitHub provider
- AWS CloudTrail, S3, CloudWatch Logs, and CloudWatch alarms
- Azure Activity Log and Azure Monitor diagnostic settings
- HCP Terraform audit trail API
- Open Policy Agent and Rego
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp HCP Terraform audit trails API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/audit-trails
- Terraform AWS provider `aws_cloudtrail` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider `aws_cloudwatch_log_metric_filter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform GitHub provider `github_branch_protection` documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent Terraform documentation: https://www.openpolicyagent.org/docs/terraform
- Microsoft Azure Activity Log schema documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log-schema
- Microsoft Azure Monitor diagnostic settings documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The GitHub branch protection example was fenced as YAML even though the snippet is Terraform HCL. Changed the code fence to `hcl`.
- The CloudTrail snippet claimed to enable logging for all API calls, but it only covered management events plus S3 data events for the Terraform state bucket. Updated the comment to match the actual configuration.
- The S3 backend example used `dynamodb_table`, which is now documented as deprecated for S3 backend state locking. Replaced it with `use_lockfile = true`.
- The Terraform Cloud audit trail example used JSON:API-style `.attributes` fields and implied Terraform Enterprise support for the API. Updated the text to HCP Terraform, used the documented ISO8601 `since` value, and changed `jq` to the documented response fields.
- The OPA snippet used pre-OPA-1.0 Rego partial-set syntax and was fenced as Python. Updated it to Rego with `import rego.v1`, `contains`, and `if`.
- The CloudWatch alarm example used a direct `AWS/S3` `PutObject` metric that is not a valid native S3 metric for this use case. Replaced it with a CloudWatch Logs metric filter over CloudTrail events and an alarm on the resulting custom metric.
- The drift detection workflow piped `terraform plan -detailed-exitcode` to `tee` and then captured `tee`'s exit code instead of Terraform's. Updated the workflow to use Bash `PIPESTATUS[0]` and fail only on Terraform exit code `1`.

## Review Notes
Terraform and OPA CLIs were not installed in the local workspace, so snippet validation was performed against official documentation rather than local command execution.
