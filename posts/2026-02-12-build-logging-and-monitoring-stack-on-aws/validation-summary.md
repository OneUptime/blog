# Validation Summary: How to Build a Logging and Monitoring Stack on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- Amazon CloudWatch custom metrics and Embedded Metric Format
- AWS X-Ray
- AWS CDK v2
- Amazon API Gateway
- Amazon SNS
- JavaScript / Node.js

## Sources Consulted
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS CDK `aws_lambda.Function` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html
- AWS CDK `aws_lambda.Runtime` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CDK `aws_lambda_nodejs` README: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
- CloudWatch Logs Insights query syntax and `stats` documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html and https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- CloudWatch Logs Insights operations and functions documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- CloudWatch Embedded Metric Format specification: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
- `aws-embedded-metrics` Node.js client documentation: https://github.com/awslabs/aws-embedded-metrics-node
- AWS X-Ray SDK for Node.js documentation and SDK/daemon maintenance notice: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs.html
- AWS X-Ray JavaScript SDK AWS SDK client tracing documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html
- AWS X-Ray SDK and daemon support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2
- CloudWatch agent documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html
- Referenced OneUptime centralized log aggregation article: https://oneuptime.com/blog/post/2026-02-12-build-centralized-log-aggregation-system-on-aws/view

## Issues Found
- Updated CDK Lambda examples from `lambda.Runtime.NODEJS_18_X` to `lambda.Runtime.NODEJS_22_X` because AWS lists Node.js 18 as deprecated as of September 1, 2025, while Node.js 22 is a supported current runtime.
- Fixed the CloudWatch Logs Insights error-rate query. The original query used `sum(level = "ERROR")`, but AWS documents `sum()` as taking a numeric log field. The query now creates a numeric `is_error` field with `case(...)` and sums that field.
- Fixed the EMF example to set the `OrderService` namespace before publishing metrics. Without `metrics.setNamespace('OrderService')`, the dashboard metrics using the `OrderService` namespace would not match the emitted metrics. Also changed `setDimensions` to the documented Node.js client example style, `putDimensions`.
- Updated the X-Ray JavaScript example away from `require('aws-sdk')` and `captureAWS(...)`, because AWS SDK for JavaScript v2 reached end of support on September 8, 2025. The example now uses AWS SDK for JavaScript v3 with `captureAWSv3Client(...)`.
- Added a short X-Ray SDK maintenance caveat. AWS states the X-Ray SDKs and daemon entered maintenance mode on February 25, 2026 and recommends OpenTelemetry for new instrumentation.
- Corrected the CloudWatch dashboard widget title from "Lambda Concurrent Executions" to "Lambda Invocations and Errors" because the widget graphs `metricInvocations()` and `metricErrors()`, not concurrent execution metrics.

## Review Notes
The snippets are illustrative and omit surrounding imports and application-specific functions such as `processOrder` and `callPaymentService`. The CDK `logGroup` property for Lambda is current and documented, but AWS notes regional availability considerations for user-controlled Lambda log groups.
