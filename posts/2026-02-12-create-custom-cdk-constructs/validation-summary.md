# Validation Summary: How to Create Custom CDK Constructs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- TypeScript
- AWS Lambda
- Amazon CloudWatch alarms, dashboards, and metric math
- Amazon S3
- Amazon ECS on AWS Fargate
- Application Load Balancer
- npm packages

## Sources Consulted
- AWS CDK v2 `cdk init` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- AWS CDK v2 `aws_lambda.Function` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html
- AWS CDK v2 CloudWatch `MathExpression` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.MathExpression.html
- AWS CDK v2 CloudWatch `Alarm` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html
- AWS Lambda metrics documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon CloudWatch metric math documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- AWS CDK v2 S3 `BucketProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html
- AWS CDK v2 ECS deployment circuit breaker documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.DeploymentCircuitBreaker.html
- AWS CDK v2 Application Load Balancer metrics documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.IApplicationLoadBalancerMetrics.html
- AWS Lambda runtime support documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- npm package metadata for `aws-cdk-lib` and `constructs`: https://www.npmjs.com/package/aws-cdk-lib and https://www.npmjs.com/package/constructs

## Issues Found
- The Lambda example labeled `errorRateThreshold` as a percentage but alarmed on `metricErrors()`, which is an error count. Changed the alarm to use a CloudWatch `MathExpression` that calculates `(errors / invocations) * 100`, guarded with `IF(invocations > 0, ..., 0)`.
- The Lambda example used the deprecated `logRetention` property. Replaced it with an explicit `logs.LogGroup` passed through the `logGroup` property, which is the current CDK recommendation.
- The usage example used `lambda.Runtime.NODEJS_20_X`. As of June 3, 2026, AWS lists Node.js 20 for Lambda with a deprecation date of April 30, 2026, so the example was updated to `lambda.Runtime.NODEJS_22_X`.
- The ALB dashboard example used deprecated `metricRequestCount()` and `metricTargetResponseTime()` methods. Updated them to `loadBalancer.metrics.requestCount()` and `loadBalancer.metrics.targetResponseTime()`.

## Review Notes
The reviewed snippets were transcribed into a temporary TypeScript project and checked with `aws-cdk-lib@2.257.0`, `constructs@10.6.0`, and TypeScript 5.9.3. The corrected examples passed `npx tsc --noEmit`. The S3 example enables server access logging by setting `serverAccessLogsPrefix`; CDK documents that when no logging bucket is provided, logs are written to the same bucket.
