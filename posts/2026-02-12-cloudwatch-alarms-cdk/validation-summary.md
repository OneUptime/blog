# Validation Summary: How to Create CloudWatch Alarms with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- TypeScript
- Amazon CloudWatch alarms, metric math, and composite alarms
- Amazon SNS topics and subscriptions
- AWS Lambda
- Amazon DynamoDB
- Amazon SQS
- Amazon EC2 metrics

## Sources Consulted
- AWS CDK v2 `cdk init` command documentation: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- AWS CDK v2 `aws-cdk-lib` module/package documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
- AWS CDK v2 CloudWatch `Alarm` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html
- AWS CDK v2 CloudWatch `MathExpression` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.MathExpression.html
- AWS CDK v2 CloudWatch `CompositeAlarm` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.CompositeAlarm.html
- AWS CDK v2 Lambda `Runtime` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CDK v2 DynamoDB `Table` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html
- Amazon CloudWatch composite alarms documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- npm package metadata for `aws-cdk-lib` and deprecated CDK v1 `@aws-cdk/aws-*` packages.

## Issues Found
- The setup command installed CDK v1 service packages such as `@aws-cdk/aws-cloudwatch`, even though the examples use CDK v2 imports from `aws-cdk-lib`. Replaced the install command with `npm install aws-cdk-lib constructs`, which matches CDK v2.
- The Lambda example used `lambda.Runtime.NODEJS_20_X`. AWS Lambda lists Node.js 20 with a deprecation date of April 30, 2026, so it is deprecated as of the validation date. Updated the example to `lambda.Runtime.NODEJS_22_X`, which is available in the current AWS CDK v2 runtime API.

## Review Notes
- The combined TypeScript examples were checked in a scratch project with `aws-cdk-lib@2.257.0`, `constructs@10`, and `typescript`; the relevant CDK APIs compiled successfully after the runtime update.
- The OneUptime cross-links for SNS topics/subscriptions and EventBridge rules returned HTTP 200.
