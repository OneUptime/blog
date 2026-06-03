# Validation Summary: How to Use CDK L2 Constructs for Common AWS Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- TypeScript
- Amazon S3
- AWS Lambda
- Amazon DynamoDB
- Amazon SQS
- Amazon SNS
- Amazon API Gateway REST APIs
- IAM grants and Lambda event sources

## Sources Consulted
- AWS CDK v2 S3 `BucketProps` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html
- AWS CDK v2 Lambda `FunctionProps` API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda/FunctionProps.html
- AWS CDK v2 DynamoDB `TableProps` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html
- AWS CDK v2 DynamoDB `PointInTimeRecoverySpecification` API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_dynamodb/PointInTimeRecoverySpecification.html
- AWS CDK v2 Lambda event sources documentation: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda_event_sources/README.html
- AWS CDK v2 SNS construct library documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns-readme.html
- AWS CDK v2 API Gateway construct library documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html

## Issues Found
- The S3 section said public access is blocked by default. CDK's S3 bucket props document that CloudFormation defaults apply and new buckets/objects do not allow public access by default, but this is not the same as explicitly configuring S3 Block Public Access. Updated the text and added `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL` to the production bucket example.
- The DynamoDB example used the deprecated `pointInTimeRecovery` property. Replaced it with `pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }`, which is the current CDK v2 API.
- The DynamoDB snippet was described as using "auto-scaling" while the code used `PAY_PER_REQUEST` on-demand billing and did not configure provisioned capacity auto scaling. Updated the comment to "indexes and on-demand billing."
- The DynamoDB and SQS examples used `lambdaEventSources` without importing `aws-cdk-lib/aws-lambda-event-sources`. Added the missing imports.
- The API Gateway usage-plan example created an API key and usage plan but did not mark methods as requiring an API key or associate the usage plan with the deployed stage. Added `apiKeyRequired: true` to the methods and `usagePlan.addApiStage({ stage: api.deploymentStage, ... })`.

## Review Notes
The snippets are illustrative fragments and still assume surrounding CDK stack context plus previously declared resources such as Lambda functions, queues, and tables. Runtime synthesis was not performed in this workspace because the blog project does not include `aws-cdk-lib` dependencies; validation was based on official AWS CDK documentation and static inspection.
