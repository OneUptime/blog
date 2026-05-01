# Validation Summary: How to Design a Serverless Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Lambda
- AWS IAM
- Amazon CloudWatch Logs
- AWS X-Ray
- Amazon VPC
- API Gateway

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- Terraform language syntax reference: https://developer.hashicorp.com/terraform/language/syntax/configuration
- AWS provider `aws_lambda_function` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- AWS provider `aws_iam_role_policy_attachment` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy_attachment.html.markdown
- AWS provider `aws_iam_role_policy` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown
- AWS provider `aws_cloudwatch_log_group` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_group.html.markdown
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Visualize Lambda function invocations using AWS X-Ray: https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html
- AWSLambdaVPCAccessExecutionRole managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- AWSXRayDaemonWriteAccess managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSXRayDaemonWriteAccess.html
- Sending Lambda function logs to CloudWatch Logs: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions-logs.html

## Issues Found
- The HCL examples used semicolons inside block bodies and object expressions, which is not valid configuration syntax. I rewrote those snippets using standard newline-separated arguments so the examples parse correctly.
- The default runtime was `nodejs20.x`, which AWS Lambda marked deprecated on April 30, 2026. I updated the default to `nodejs22.x` so the example uses a current non-deprecated runtime.
- The module enabled `tracing_config` when `enable_xray` was true, but it did not grant the execution role the X-Ray permissions Lambda requires. I added a conditional attachment for `arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess`.
- The description and introduction said the module handled optional API Gateway integration, but the module only exposed `invoke_arn` and did not create API Gateway resources. I corrected the wording to say it provides outputs needed for optional API Gateway integration.
- The conclusion said creating the log group before the function meant logs were "always captured," which overstated the effect of the log-group resource. I corrected that wording to describe the actual benefit: retention and tags are managed from the start.

## Review Notes
- The corrected HCL code blocks were re-parsed locally after editing to confirm they are syntactically valid.
- The module still relies on callers to provide a valid `deployment_package` combination. Adding a `validation` block in the future could enforce `filename` versus `s3_bucket`/`s3_key` requirements earlier, but the current article is technically correct after the fixes above.
