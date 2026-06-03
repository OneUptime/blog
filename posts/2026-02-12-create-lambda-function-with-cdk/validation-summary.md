# Validation Summary: How to Create a Lambda Function with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS CDK v2
- TypeScript
- Node.js Lambda runtimes
- Lambda layers
- Lambda event sources for SQS, DynamoDB Streams, S3, API Gateway, and EventBridge
- IAM permissions and CDK grant methods
- Lambda dead letter queues
- Lambda VPC access
- Lambda function URLs
- Lambda aliases, versions, and provisioned concurrency autoscaling

## Sources Consulted
- AWS CDK API Reference: `aws-cdk-lib.aws_lambda.Function` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html
- AWS CDK API Reference: `aws-cdk-lib.aws_lambda.Runtime` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Developer Guide: Building Lambda functions with Node.js - https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS CDK API Reference: `aws-cdk-lib.aws_lambda_nodejs.NodejsFunction` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html
- AWS CDK Lambda construct library README: Function URLs and October 2025 permission update - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html
- AWS Lambda Developer Guide: Control access to Lambda function URLs - https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS CDK API Reference: Lambda event source props - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources-readme.html
- AWS Lambda Developer Guide: Configuring provisioned concurrency - https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html

## Issues Found
- The examples used `lambda.Runtime.NODEJS_20_X`. AWS Lambda lists Node.js 20 as deprecated as of April 30, 2026, so the examples now use `lambda.Runtime.NODEJS_22_X`, which is still a supported managed runtime on the validation date.
- The post said CDK automatically manages log groups and used the deprecated `logRetention` property. I updated the explanation to distinguish Lambda's default log group from CDK-managed log groups, and changed the example to use an explicit `logs.LogGroup` with the `logGroup` property.

## Review Notes
- The Function URL example remains valid with current CDK: CDK documentation says `addFunctionUrl()` and `grantInvokeUrl()` were updated for the October 2025 requirement that Function URLs need both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` permissions.
- The snippets are illustrative and assume the surrounding stack defines referenced resources and imports such as tables, queues, buckets, VPCs, security groups, and IAM constructs.
