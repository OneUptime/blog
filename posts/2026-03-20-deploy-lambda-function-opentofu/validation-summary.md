# Validation Summary: How to Deploy a Lambda Function with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS Lambda
- AWS IAM (roles and managed policies)
- AWS CloudWatch Logs
- AWS Lambda Function URLs
- AWS EventBridge (CloudWatch Events) for scheduling
- `archive_file` data source from the `hashicorp/archive` provider
- AWS provider (`hashicorp/aws`) resources: `aws_lambda_function`, `aws_lambda_function_url`, `aws_lambda_permission`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_cloudwatch_log_group`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`

## Sources Consulted
- Terraform AWS provider docs for `aws_lambda_function` (https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown)
- Terraform AWS provider docs for `aws_lambda_function_url` (https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function_url.html.markdown)
- Terraform `archive_file` data source documentation (hashicorp/archive provider)
- AWS managed policy ARNs for Lambda execution roles (`AWSLambdaBasicExecutionRole`, `AWSLambdaVPCAccessExecutionRole`)
- AWS Lambda runtime identifiers documentation (nodejs20.x, python3.12)

## Issues Found
No technical issues found.

Verified items:
- `data "archive_file"` arguments (`type`, `source_dir`, `output_path`) and the `output_base64sha256` attribute used for `source_code_hash` are correct.
- `aws_iam_role` `assume_role_policy` correctly uses `lambda.amazonaws.com` as the service principal with `sts:AssumeRole`.
- AWS managed policy ARNs `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole` and `arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole` are accurate.
- `aws_lambda_function` arguments are valid: `function_name`, `description`, `filename`, `source_code_hash`, `runtime`, `handler`, `role`, `timeout`, `memory_size`, `environment.variables`, `vpc_config.subnet_ids`, `vpc_config.security_group_ids`, `reserved_concurrent_executions`, `tags`, `depends_on`.
- The claim that setting `reserved_concurrent_executions = 0` throttles the function completely matches AWS behavior (0 disables invocation; default is -1 = unreserved).
- Runtime examples `nodejs20.x` and `python3.12` are valid current Lambda runtime identifiers.
- `aws_lambda_function_url` `cors` block fields (`allow_credentials`, `allow_origins`, `allow_methods`, `max_age`) are all valid; `authorization_type` values `NONE` and `AWS_IAM` are correct.
- CloudWatch log group naming convention `/aws/lambda/<function-name>` is the AWS-managed default that Lambda uses.
- EventBridge schedule trigger pattern (`aws_cloudwatch_event_rule` + `aws_cloudwatch_event_target` + `aws_lambda_permission` with `events.amazonaws.com` principal) is correct.
- `try(aws_lambda_function_url.main.function_url, null)` correctly references the `function_url` attribute.

## Review Notes
- The post references `aws_security_group.lambda[0].id` inside the `vpc_config` block, but the security group resource itself is not shown in the snippets. Readers must define one (with matching `count = var.enable_vpc ? 1 : 0`) elsewhere — acceptable for a focused tutorial but worth noting.
- The post uses `aws_cloudwatch_event_rule` / `aws_cloudwatch_event_target` (the classic EventBridge "Events" API). AWS now also offers EventBridge Scheduler (`aws_scheduler_schedule`) as a more capable alternative for scheduled invocations. The classic resources remain fully supported and are not deprecated.
- Lambda runtimes have a deprecation lifecycle; `nodejs20.x` and `python3.12` are current as of the validation date but readers should consult the AWS Lambda runtimes page when adopting this template later.
- The `depends_on` on the function intentionally references the log group so the group's `retention_in_days` is enforced before Lambda auto-creates one; this is a known best practice and is correctly applied here.
