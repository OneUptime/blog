# Validation Summary: How to Handle Lambda Cold Start Optimization with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Lambda (provisioned concurrency, SnapStart, layers, VPC config, ARM64 architecture)
- AWS Application Auto Scaling (target tracking, scheduled actions)
- AWS EventBridge / CloudWatch Events (scheduled rules, targets, Lambda permissions)
- AWS IAM (Lambda execution roles)
- AWS VPC / Subnets / Security Groups
- Node.js Lambda runtime
- Java 21 Lambda runtime (SnapStart)

## Sources Consulted
- Terraform AWS Provider — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider — `aws_lambda_alias`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_alias
- Terraform AWS Provider — `aws_lambda_provisioned_concurrency_config`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_provisioned_concurrency_config
- Terraform AWS Provider — `aws_lambda_layer_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Terraform AWS Provider — `aws_appautoscaling_target` / `aws_appautoscaling_policy` / `aws_appautoscaling_scheduled_action`
- Terraform AWS Provider — `aws_cloudwatch_event_rule` / `aws_cloudwatch_event_target` / `aws_lambda_permission`
- AWS Lambda Developer Guide — Provisioned concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS Lambda Developer Guide — SnapStart: https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- AWS Lambda Developer Guide — Runtime support policy: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Application Auto Scaling target tracking predefined metrics: https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-target-tracking.html
- AWS EventBridge / CloudWatch Schedule expressions (cron and rate): https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html

## Issues Found
- The post used `runtime = "nodejs18.x"` (and `compatible_runtimes = ["nodejs18.x"]` on the layer). Node.js 18 reached end of standard support for AWS Lambda on 2025-09-01 and is now deprecated. Replaced all five occurrences with `nodejs20.x`, which matches the convention used by sibling posts in this repository and is currently supported.

## Review Notes
- The `high_priority = 3008` tier in the memory-tuning example is still a valid Lambda memory size, but the current Lambda maximum is 10,240 MB. The post frames `3008` as "fastest possible starts", which is no longer strictly accurate. Left unchanged because `3008` was historically a meaningful tier and the example reads as one possible configuration rather than an absolute claim about the maximum.
- The "5 to 15 minutes" idle recycling estimate is consistent with widely reported community measurements; AWS does not publish an official figure, so this is acceptable as an approximation.
- The Terraform `aws_lambda_provisioned_concurrency_config` arguments (`function_name`, `qualifier`, `provisioned_concurrent_executions`) are correct.
- The Application Auto Scaling configuration is correct: `service_namespace = "lambda"`, `scalable_dimension = "lambda:function:ProvisionedConcurrency"`, `resource_id = "function:NAME:ALIAS"`, and `predefined_metric_type = "LambdaProvisionedConcurrencyUtilization"` all match the AWS documentation.
- The SnapStart configuration (`snap_start { apply_on = "PublishedVersions" }` with `publish = true` and `runtime = "java21"`) is current and correct.
- The 6-field AWS cron expressions (`cron(0 8 ? * MON-FRI *)`, `cron(0 20 ? * MON-FRI *)`) are valid.
