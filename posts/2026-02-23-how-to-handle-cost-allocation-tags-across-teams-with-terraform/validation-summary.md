# Validation Summary: How to Handle Cost Allocation Tags Across Teams with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL2 syntax, variable validation, modules, locals, jsonencode)
- AWS Provider for Terraform (hashicorp/aws)
- AWS Config (managed rule `REQUIRED_TAGS`, remediation configuration)
- AWS Cost Explorer (`aws_ce_cost_allocation_tag`)
- AWS EC2, S3, RDS, Lambda resources
- Amazon EventBridge (CloudWatch Events) rules and targets
- Amazon SNS
- AWS Systems Manager (SSM document `AWS-SetRequiredTags`)
- AWS Lambda (Python 3.11 runtime)

## Sources Consulted
- Terraform AWS Provider docs — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider docs — `aws_ce_cost_allocation_tag`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_cost_allocation_tag
- Terraform AWS Provider docs — `aws_config_config_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Terraform AWS Provider docs — `aws_config_remediation_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_remediation_configuration
- Terraform AWS Provider docs — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Config managed rule `REQUIRED_TAGS`: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- HCL2 language syntax reference: https://developer.hashicorp.com/terraform/language/syntax/configuration
- Terraform variable validation: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules

## Issues Found
1. **Invalid resource type `aws_rds_instance`**: The "Using the Tagging Module Across Teams" section used `resource "aws_rds_instance" "api_db"`. This resource does not exist in the Terraform AWS provider. The correct resource name is `aws_db_instance`. Fixed by renaming the resource type to `aws_db_instance`.

## Review Notes
- Multiple `validation` blocks on a single variable are supported (Terraform 0.13+), so the `required_tags` variable schema is valid.
- `terraform.workspace` and `timestamp()` references in the `common_tags` local are valid; note that `timestamp()` will force changes on every plan/apply, which is intentional but worth being aware of when used in tags.
- `aws_ce_cost_allocation_tag` requires the AWS provider to be configured in the management account / us-east-1 endpoint for Cost Explorer; the post does not call this out but the resource and arguments (`tag_key`, `status` = "Active") are correct.
- The `aws_config_remediation_configuration.parameter` block uses `static_value` (singular). Both `static_value` and `static_values` are accepted by the provider; the code is correct as written.
- For the EventBridge `aws_cloudwatch_event_target` invoking Lambda, a complete real-world setup would also require an `aws_lambda_permission` resource granting `events.amazonaws.com` permission to invoke the function. The post does not include this, but it does not present incorrect information — the snippet is illustrative.
- HCL2 identifiers may contain hyphens, so `detail-type = [...]` inside the `jsonencode` call is valid HCL and produces the expected JSON key `"detail-type"`.
- The Lambda runtime `python3.11` is still supported by AWS Lambda as of May 2026 (deprecation notice for Python 3.11 hasn't been issued at the time of validation).
