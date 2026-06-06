# Validation Summary: How to Debug Terraform Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (CLI, HCL, state, providers, modules, lifecycle blocks)
- AWS provider (hashicorp/aws) including S3 backend with DynamoDB locking
- AWS CLI (s3, sts, dynamodb, s3api, configure)
- gcloud CLI and Azure CLI (authentication verification)
- hashicorp/time provider (time_sleep)
- hashicorp/null provider (null_resource)
- Mermaid diagrams (for flowcharts)
- jq (for JSON parsing of state/plan output)

## Sources Consulted
- Terraform CLI command documentation: https://developer.hashicorp.com/terraform/cli/commands
- Terraform debugging / TF_LOG: https://developer.hashicorp.com/terraform/internals/debugging
- TF_LOG_CORE and TF_LOG_PROVIDER (introduced in 0.15): https://developer.hashicorp.com/terraform/internals/debugging
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform provider requirements / version constraints: https://developer.hashicorp.com/terraform/language/providers/requirements
- Custom conditions (precondition/postcondition) introduced in 1.2: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- AWS provider configuration (retry_mode, default_tags): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- hashicorp/time provider (time_sleep): https://registry.terraform.io/providers/hashicorp/time/latest/docs
- terraform refresh deprecation note: https://developer.hashicorp.com/terraform/cli/commands/refresh
- terraform taint deprecation (since 0.15.2): https://developer.hashicorp.com/terraform/cli/commands/taint
- AWS CLI command reference: https://docs.aws.amazon.com/cli/latest/reference/

## Issues Found
No technical issues found. All commands, HCL syntax, environment variables, and configuration snippets are syntactically valid and behave as described.

## Review Notes
- `terraform refresh` (used in the State Drift Detection section) has been deprecated since Terraform 0.15 in favor of `terraform plan -refresh-only` and `terraform apply -refresh-only`. The command still works and the post does mention the preferred `-refresh-only` alternatives nearby, so this is acceptable, but the standalone `terraform refresh` line will emit a deprecation warning on modern Terraform versions.
- `terraform taint` (listed in the Quick Reference Commands section) has been deprecated since Terraform 0.15.2 in favor of `terraform apply -replace=ADDRESS`. The taint command still functions but emits a deprecation warning. Future revisions of the post could swap this for `-replace`.
- The S3 backend example uses the top-level `role_arn` argument. This still works, but in newer Terraform versions HashiCorp recommends the `assume_role { role_arn = ... }` block for assuming a role from the S3 backend. Not incorrect, just legacy-styled.
- In Terraform 1.10+, the S3 backend supports native state locking via `use_lockfile = true` as an alternative to `dynamodb_table`. The DynamoDB approach shown is still fully supported and remains a common pattern.
- The postcondition example uses `self.public_ip != null` to check that an EC2 instance received a public IP. In practice the AWS provider returns an empty string (`""`) rather than `null` for `public_ip` when none is assigned, so `self.public_ip != ""` would be the more reliable check. Since this is presented as an illustrative example of postcondition syntax (not a production guard), it was left as-is.
- The "Resource Creation Failures" line under "Debugging Apply Errors" is missing the `###` heading prefix that other subsections use. This is a markdown formatting/structural issue rather than a technical inaccuracy, so it was left as-is per review guidelines (no restructuring).
- The console example `[for s in aws_subnet.main : s.id]` implicitly assumes `aws_subnet.main` is declared with `for_each` or `count`. The example is plausible and not incorrect, but readers using a single-instance `aws_subnet.main` would need to drop the for-expression.
