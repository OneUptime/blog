# Validation Summary: How to Create Lambda with Provisioned Concurrency in Terraform

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform (AWS provider)
- AWS Lambda (functions, versions, aliases)
- AWS Lambda Provisioned Concurrency
- AWS Application Auto Scaling (target tracking + scheduled actions)
- Amazon API Gateway v2 (HTTP API)
- Amazon CloudWatch (metric alarms)
- Amazon SNS (alert notifications)
- AWS IAM (Lambda execution role)

## Sources Consulted
- Terraform AWS provider — `aws_lambda_provisioned_concurrency_config`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_provisioned_concurrency_config
- Terraform AWS provider — `aws_lambda_alias`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_alias
- Terraform AWS provider — `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider — `aws_appautoscaling_target` / `aws_appautoscaling_policy`
- AWS Lambda Developer Guide — Provisioned concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS Lambda Developer Guide — Working with CloudWatch metrics: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html
- AWS API Gateway v2 documentation

## Issues Found

1. **Misleading latency claim ("guaranteed sub-millisecond initialization latency")** — *Fixed*.
   - What was wrong: The "How Provisioned Concurrency Works" section claimed provisioned concurrency provides "guaranteed sub-millisecond initialization latency." This is misleading. Provisioned concurrency eliminates the Init phase for pre-warmed environments entirely; it does not produce sub-millisecond latencies for the function itself. AWS documentation describes the benefit as enabling "double-digit millisecond response times" for interactive workloads.
   - Fix: Rewrote the sentence to state that the initialization phase is eliminated for pre-warmed environments, enabling consistent double-digit millisecond response times.

2. **Broken CloudWatch alarm using `metric_query` math expression** — *Fixed*.
   - What was wrong: The `aws_cloudwatch_metric_alarm.provisioned_utilization_high` resource defined a math expression `invocations / provisioned` where `invocations` was actually `ProvisionedConcurrentExecutions` and `provisioned` was actually `ProvisionedConcurrencyUtilization`. Dividing the count of concurrent executions by an already-computed utilization fraction is meaningless — it does not yield a utilization percentage. Additionally, `ProvisionedConcurrencyUtilization` is itself a decimal value between 0 and 1 representing exactly the utilization the alarm was trying to compute.
   - Fix: Replaced the multi-`metric_query` configuration with a direct alarm on the `ProvisionedConcurrencyUtilization` metric using the standard `metric_name`/`namespace`/`statistic`/`dimensions` form. Threshold (0.85) and the rest of the alarm semantics are preserved.

## Review Notes
- The remaining Terraform resources verified accurate against current AWS provider docs:
  - `aws_lambda_provisioned_concurrency_config` attributes (`function_name`, `provisioned_concurrent_executions`, `qualifier`) are correct.
  - `aws_appautoscaling_target` values (`scalable_dimension = "lambda:function:ProvisionedConcurrency"`, `service_namespace = "lambda"`, `resource_id = "function:NAME:ALIAS"`) are correct.
  - Predefined metric type `LambdaProvisionedConcurrencyUtilization` for target tracking is correct.
  - CloudWatch metric names and dimensions (`FunctionName` + `Resource` formatted as `function-name:alias`) are correct.
  - `aws_lambda_alias.invoke_arn` is valid for API Gateway `integration_uri`.
  - `aws_lambda_permission` with `qualifier = alias_name` is the correct pattern for granting invoke permission on the alias.
- Runtime `nodejs20.x` is a currently supported Lambda runtime.
- Cron expression syntax (`cron(0 8 ? * MON-FRI *)`) follows the AWS scheduled actions / EventBridge cron format correctly.
- Minor stylistic note (not changed): `target_value = 0.7` is the correct unit for `LambdaProvisionedConcurrencyUtilization` (fraction, not percentage). The inline comment "70%" is accurate.
- No version-specific caveats beyond the standard reminder that Lambda runtimes deprecate over time — `nodejs20.x` should be reviewed for support status if this post is read after Node.js 20 LTS support ends.
