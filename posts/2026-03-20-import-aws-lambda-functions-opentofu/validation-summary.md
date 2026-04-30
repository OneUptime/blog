# Validation Summary: How to Import AWS Lambda Functions into OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Lambda
- AWS CLI
- AWS IAM
- Amazon SQS
- Amazon CloudWatch Logs
- HCL

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- AWS CLI `get-function-configuration`: https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-configuration.html
- AWS CLI `get-event-source-mapping`: https://docs.aws.amazon.com/cli/latest/reference/lambda/get-event-source-mapping.html
- AWS Lambda `GetEventSourceMapping` API reference: https://docs.aws.amazon.com/lambda/latest/api/API_GetEventSourceMapping.html
- Terraform AWS provider `aws_lambda_function` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown
- Terraform AWS provider `aws_lambda_event_source_mapping` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_event_source_mapping.html.markdown
- Terraform AWS provider `aws_cloudwatch_log_group` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_log_group.html.markdown
- Terraform AWS provider `aws_iam_role` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/iam_role.html.markdown
- Terraform Archive provider `archive_file` data source documentation: https://github.com/hashicorp/terraform-provider-archive/blob/main/docs/data-sources/file.md

## Issues Found
- The AWS CLI `--query` example used JMESPath field references with leading dots, which is not the documented AWS CLI/JMESPath syntax for a multiselect hash. I changed the query to use valid identifiers and included `description` plus `environment_variables` so the inventory output lines up with the HCL shown later.
- The HCL example referenced `var.vpc_config` without declaring the variable. I added a `variable "vpc_config"` block so the snippet is self-contained and valid as written.
- The comment above `filename` and `source_code_hash` incorrectly implied that code management depended on switching to S3 or archive deployment, even though the snippet already used an archive. I rewrote the comment to accurately describe that the placeholder package prevents OpenTofu from managing code updates until a real artifact is supplied.
- The placeholder archive path used `/tmp/placeholder.zip`, which is a weaker choice for reproducible plan/apply workflows. I changed it to `${path.module}/placeholder.zip` so the file is created alongside the configuration instead of under a temporary directory.
- The SQS ARN example used an invalid 9-digit AWS account ID. I corrected it to a valid 12-digit account ID format.
- The event source mapping import example used a UUID-like placeholder that did not match AWS's documented example format. I replaced it with the AWS CLI documentation example value.

## Review Notes
The `data "archive_file"` approach is technically valid for normal apply workflows, but the archive provider documentation notes that data-source-generated archives are built during planning and must persist through apply. In split plan/apply pipelines, using the `archive_file` resource or otherwise persisting the generated artifact can be safer.
