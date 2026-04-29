# Validation Summary: How to Create Lambda Functions with ZIP Deployment in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- AWS IAM
- Amazon CloudWatch Logs
- AWS X-Ray
- AWS CLI
- Python

## Sources Consulted
- OpenTofu data sources documentation: https://opentofu.org/docs/v1.8/language/data-sources/
- HashiCorp archive provider `archive_file` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-archive/main/docs/data-sources/file.md
- HashiCorp AWS provider `aws_lambda_function` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- HashiCorp AWS provider `aws_cloudwatch_log_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_group.html.markdown
- HashiCorp AWS provider `aws_iam_role_policy_attachment` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy_attachment.html.markdown
- HashiCorp AWS provider `aws_iam_role_policy` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown
- AWS Lambda Python documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda `UpdateFunctionConfiguration` API reference: https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionConfiguration.html
- AWS Lambda X-Ray tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html
- AWS Lambda execution-role managed policies documentation: https://docs.aws.amazon.com/lambda/latest/dg/permissions-managed-policies.html
- AWS managed policy reference for `AWSXRayDaemonWriteAccess`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSXRayDaemonWriteAccess.html
- AWS CLI `lambda invoke` command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS Lambda synchronous invocation documentation: https://docs.aws.amazon.com/lambda/latest/dg/invocation-sync.html

## Issues Found
- The description claimed the post covered VPC configuration, but the article did not include any `vpc_config` example. I corrected the description to match the actual content and softened the introduction’s coverage claim from “all common configurations” to “common configurations.”
- The execution role enabled `tracing_config { mode = "Active" }` without granting the Lambda role permission to send trace data to X-Ray. I added an `aws_iam_role_policy_attachment` for `AWSXRayDaemonWriteAccess`, which AWS documents as required for active tracing.
- The inline IAM policy referenced `aws_dynamodb_table.main.arn`, but that resource is not defined anywhere in the post. I changed the reference to `var.table_arn` so the example remains focused on the Lambda setup without requiring an undeclared Terraform resource.
- The CloudWatch log group example said it would “pre-create” the log group, but the original configuration named the log group from `aws_lambda_function.main.function_name`, which makes the log group depend on the Lambda function instead of the other way around. I changed the log group name to `var.function_name` and added `depends_on = [aws_cloudwatch_log_group.lambda]` to the Lambda resource so the log group is actually created first.
- The AWS CLI test command omitted `--cli-binary-format raw-in-base64-out`, which AWS CLI v2 requires when passing inline JSON payloads. I added the flag to the example command.

## Review Notes
- The post’s use of `source_code_hash = data.archive_file.lambda_zip.output_base64sha256` is still valid for detecting local ZIP package changes. Current AWS provider documentation also documents `code_sha256`, which is useful when you want update detection to reflect Lambda’s reported code hash, including some out-of-band code changes.
