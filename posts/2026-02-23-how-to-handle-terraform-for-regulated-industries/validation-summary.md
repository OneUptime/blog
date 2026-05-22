# Validation Summary: How to Handle Terraform for Regulated Industries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- AWS KMS
- Amazon S3
- AWS CloudTrail
- Amazon CloudWatch Logs
- Amazon VPC Flow Logs
- Open Policy Agent/Rego
- GitHub Actions
- HIPAA, SOC 2, PCI DSS, and FedRAMP compliance concepts

## Sources Consulted
- HashiCorp Terraform CLI documentation for `terraform plan` and `-detailed-exitcode`: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform JSON output format documentation for `resource_changes` and `change.after`: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform AWS Provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS Provider documentation for `aws_flow_log`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- AWS CloudFormation CloudTrail `DataResource` documentation for CloudTrail data event resource values: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudtrail-trail-dataresource.html
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent Rego `contains` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- GitHub Actions workflow commands documentation for `$GITHUB_OUTPUT`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

## Issues Found
- The Rego examples used legacy partial set rule syntax (`deny[msg] { ... }`). Current OPA/Rego documentation uses `contains` and `if` for multi-value rules, so the policy examples were updated to `deny contains msg if { ... }`.
- The S3 public access Rego rule claimed to require all public access blocking controls, but it only checked `block_public_acls`. Added a helper rule that verifies all four `aws_s3_bucket_public_access_block` booleans: `block_public_acls`, `block_public_policy`, `ignore_public_acls`, and `restrict_public_buckets`.
- The GitHub Actions drift detection step piped `terraform plan -detailed-exitcode` through `tee` and then wrote `$?`, which captures the pipeline status rather than Terraform's detailed exit code. Updated the snippet to read `${PIPESTATUS[0]}`, publish that value to `$GITHUB_OUTPUT`, and fail the job when Terraform exits with code `1`.

## Review Notes
- The AWS Terraform resource snippets are illustrative and reference supporting resources and variables not shown in the post, such as IAM roles, log groups, buckets, and variable declarations. That is acceptable for a guide, but readers would need those surrounding definitions in a complete module.
- The post maps compliance frameworks to common Terraform controls, but actual HIPAA, SOC 2, PCI DSS, or FedRAMP compliance depends on a complete control environment and auditor interpretation, not Terraform configuration alone.
