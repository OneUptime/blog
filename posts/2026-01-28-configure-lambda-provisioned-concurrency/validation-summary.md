# Validation Summary: How to Configure Lambda Provisioned Concurrency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS Lambda Provisioned Concurrency
- AWS CLI (lambda subcommands)
- Terraform (`aws_lambda_function`, `aws_lambda_alias`, `aws_lambda_provisioned_concurrency_config`, `aws_appautoscaling_target`, `aws_appautoscaling_policy`, `aws_appautoscaling_scheduled_action`, `aws_cloudwatch_dashboard`, `aws_cloudwatch_metric_alarm`, `aws_cloudwatch_query_definition`, `aws_apigatewayv2_integration`)
- AWS SAM (`AWS::Serverless::Function`, `AutoPublishAlias`, `ProvisionedConcurrencyConfig`, `DeploymentPreference`)
- Application Auto Scaling for Lambda
- AWS CloudWatch metrics (`ConcurrentExecutions`, `ProvisionedConcurrencyUtilization`, `ProvisionedConcurrencySpilloverInvocations`)
- CloudWatch Logs Insights
- AWS SDK for JavaScript v3 (`@aws-sdk/client-secrets-manager`)
- Node.js 20 Lambda runtime
- PostgreSQL `pg` Node.js library

## Sources Consulted
- AWS Lambda Developer Guide — Provisioned Concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS CLI Reference for Lambda: https://docs.aws.amazon.com/cli/latest/reference/lambda/ (publish-version, create-alias, put-provisioned-concurrency-config, get-provisioned-concurrency-config)
- AWS Lambda Pricing: https://aws.amazon.com/lambda/pricing/
- Terraform AWS Provider docs for `aws_lambda_provisioned_concurrency_config`, `aws_lambda_alias`, `aws_appautoscaling_*`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Application Auto Scaling for Lambda Provisioned Concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html#managing-provisioned-concurrency
- AWS SAM specification for `AWS::Serverless::Function` (ProvisionedConcurrencyConfig, AutoPublishAlias, DeploymentPreference): https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS Lambda CloudWatch metrics: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS SDK for JavaScript v3 — Secrets Manager client: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/secrets-manager/
- Node.js 20 Lambda runtime included SDKs: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Compute Savings Plans Lambda coverage: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html

## Issues Found

1. **Incorrect Provisioned Concurrency duration pricing.** The pricing comparison table listed the Provisioned Concurrency *Duration* charge as `$0.000004167/GB-s`, which is actually the provisioned (allocated) rate, not the per-invocation duration rate. Per the AWS Lambda pricing page (x86, us-east-1), invocations running on a provisioned concurrency instance are billed at `$0.0000097222/GB-s`, distinct from the always-on allocated rate of `$0.0000041667/GB-s`. Corrected the Duration row to `$0.0000097222/GB-s` and the Provisioned row to `$0.0000041667/GB-s` (added the trailing 7 to make it precise; both values are now correct).

2. **AWS SDK v2 (`aws-sdk`) used with Node.js 20 runtime.** The initialization example used `const AWS = require('aws-sdk')` and `new AWS.SecretsManager().getSecretValue({...}).promise()` with the `nodejs20.x` runtime. The Node.js 18 and later managed runtimes do not bundle AWS SDK v2 — only AWS SDK v3 is available out of the box, and SDK v2 reached end-of-support on 2025-09-08. As written, the code would fail at runtime with a "Cannot find module 'aws-sdk'" error unless the dependency was bundled into the deployment package. Updated to AWS SDK v3 idiom using `@aws-sdk/client-secrets-manager` (`SecretsManagerClient` + `GetSecretValueCommand` via `.send()`), which is available in the Node.js 20 runtime by default.

## Review Notes

- Cold-start duration ranges in the per-runtime table are inherently approximate and depend heavily on package size, memory, VPC, and initialization work. The cited ranges are reasonable order-of-magnitude figures and consistent with AWS guidance, so left as-is.
- The "up to 17% discount" figure for AWS Compute Savings Plans on Lambda is accurate as of the current Savings Plans coverage for Lambda.
- The Terraform `aws_lambda_provisioned_concurrency_config` resource arguments (`function_name`, `qualifier`, `provisioned_concurrent_executions`) are correct for the current AWS provider.
- The Application Auto Scaling configuration uses the correct `service_namespace = "lambda"`, `scalable_dimension = "lambda:function:ProvisionedConcurrency"`, predefined metric `LambdaProvisionedConcurrencyUtilization`, and resource_id format `function:<name>:<alias>`.
- SAM properties `AutoPublishAlias`, `ProvisionedConcurrencyConfig.ProvisionedConcurrentExecutions`, and `DeploymentPreference.Type: Canary10Percent10Minutes` are valid per the SAM specification.
- CloudWatch metric names and dimensions (`FunctionName`, `Resource` in `<function>:<alias>` form) for `ProvisionedConcurrencyUtilization` and `ProvisionedConcurrencySpilloverInvocations` are correct.
- The `aws_apigatewayv2_integration` snippets are minimal (no route/integration wiring shown), but the field names used are valid for the resource.
- Pricing rates are quoted with x86/us-east-1 figures; readers using arm64 or other regions will see different (typically slightly lower) numbers — not an error, but a version/region caveat worth noting.
