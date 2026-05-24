# Validation Summary: How to Create Step Functions Workflows with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Step Functions (state machines, ASL — Amazon States Language)
- Terraform (HCL, `aws_sfn_state_machine`, IAM resources, CloudWatch resources)
- AWS Lambda (Node.js runtime)
- AWS IAM (roles, trust policies, inline policies)
- Amazon CloudWatch Logs (Step Functions logging)
- Amazon EventBridge (`aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`)
- AWS API Gateway (`aws_api_gateway_rest_api`)

## Sources Consulted
- Terraform AWS provider documentation for `aws_sfn_state_machine` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sfn_state_machine
- AWS Step Functions Developer Guide (ASL spec, Task / Parallel / Map / Choice / Fail states, Retry / Catch fields) — https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html
- AWS Step Functions IAM permissions for CloudWatch Logs delivery — https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- AWS Lambda runtimes deprecation policy and supported versions — https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Step Functions service principal (`states.amazonaws.com`) — https://docs.aws.amazon.com/step-functions/latest/dg/procedure-create-iam-role.html
- EventBridge event pattern format and `aws_cloudwatch_event_target` documentation — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target

## Issues Found
- The Lambda function examples used `runtime = "nodejs18.x"`. AWS Lambda lists Node.js 18 as deprecated as of September 1, 2025, with function creation blocked thereafter, so it is no longer safe to recommend for new functions. Updated all three Lambda resource blocks to `runtime = "nodejs20.x"`, which matches the active runtime convention used elsewhere in this blog.

## Review Notes
- The Map state example uses the legacy `Iterator` field. AWS now recommends `ItemProcessor` (with optional `ProcessorConfig`) and supports both inline and distributed map processing modes. `Iterator` continues to work for backwards compatibility, so this is not a correctness issue, but the example could be modernized in the future.
- The Step Functions CloudWatch Logs IAM permission list is the standard set documented by AWS (CreateLogDelivery / Get / Update / Delete / List / PutResourcePolicy / DescribeResourcePolicies / DescribeLogGroups) — correct.
- The `log_destination` value `"${aws_cloudwatch_log_group.step_functions.arn}:*"` correctly uses the `:*` suffix required by Step Functions logging configuration.
- The IAM trust policy uses `states.amazonaws.com` as the service principal, which is the correct principal for Step Functions.
- The Express workflow example references `aws_cloudwatch_log_group.express_workflow` and the EventBridge example references `aws_iam_role.eventbridge_sfn_role` without defining them. These are forward references intended as illustrative snippets and not a correctness issue, but readers will need to create those resources separately.
- HCL comments (`#`) appear inside `jsonencode({...})` arguments. This is valid HCL: the comment is stripped before the map is serialized to JSON, so the resulting state-machine definition is well-formed JSON.
- The IAM policies use `Resource = "*"` for `lambda:InvokeFunction` and CloudWatch Logs delivery actions. CloudWatch Logs delivery APIs do not support resource-level permissions, so `"*"` is required there, but the `lambda:InvokeFunction` permission could be scoped to the specific Lambda ARNs in production.
