# Validation Summary: How to Deploy AWS Lambda Functions with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Lambda
- AWS IAM (execution roles, managed policies)
- AWS CloudWatch Logs
- AWS X-Ray (tracing)
- AWS EventBridge (CloudWatch Events) for scheduled invocations
- HashiCorp `archive` provider (`archive_file` data source)
- Lambda aliases & versioning (canary/weighted routing)

## Sources Consulted
- Terraform AWS provider docs — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider docs — `aws_lambda_alias`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_alias
- Terraform AWS provider docs — `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider docs — `aws_cloudwatch_log_group`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`
- HashiCorp `archive` provider docs — `archive_file`: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- AWS Lambda runtimes (supported & deprecated): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda `AliasRoutingConfiguration` API reference: https://docs.aws.amazon.com/lambda/latest/api/API_AliasRoutingConfiguration.html
- AWS managed policies: `AWSLambdaBasicExecutionRole`, `AWSLambdaVPCAccessExecutionRole`
- Terraform AWS provider source: `internal/service/lambda/alias.go` (validation behavior)

## Issues Found

1. **Canary alias example would fail at apply time.** The original `aws_lambda_alias` example set both `function_version` and the key inside `routing_config.additional_version_weights` to `aws_lambda_function.main.version`. The Lambda API rejects this with `InvalidParameterValueException` ("Function version specified in routingConfig.additionalVersionWeights cannot be the same as the function version specified for the alias"). Changed `function_version` to reference a `var.stable_version` (the previously deployed version) so the additional weight points at the newly published version — the canonical canary pattern shown in the official `aws_lambda_alias` docs. Added an inline comment explaining the constraint.

2. **`nodejs20.x` runtime is deprecated.** AWS deprecated the `nodejs20.x` Lambda runtime on 2026-04-30 (three days before this validation). Updated the runtime example comment from `"nodejs20.x"` to `"nodejs22.x"` so the post does not steer readers to a deprecated runtime.

3. **Memory ceiling was understated.** Comment said `128–10240 MB`. The current Lambda upper bound (and what the Terraform provider documents) is 32,768 MB (32 GB). Updated to `128–32768 MB`.

## Review Notes
- All other Terraform resources, attributes, and IAM policy ARNs verified against current provider/AWS docs and are correct: `aws_lambda_function`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_iam_role_policy`, `aws_cloudwatch_log_group` (note: the attribute is correctly named `kms_key_id` even though it accepts an ARN), `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_lambda_permission`, and the `archive_file` data source.
- The `aws_cloudwatch_event_rule` + target + permission pattern is still fully supported and not deprecated. AWS now also offers Amazon EventBridge Scheduler (`aws_scheduler_schedule`, introduced late 2022) as a more capable alternative for purely scheduled invocations (time zones, flexible windows, higher TPS). Worth mentioning in a future revision but not a correctness issue.
- Python 3.12 and Java 21 runtimes are still supported as of 2026-05-03.
- `output_base64sha256` on the `archive_file` data source is the correct attribute for triggering Lambda redeploys via `source_code_hash`.
- Tracing mode `"Active"` enables X-Ray tracing as described.
