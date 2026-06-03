# Validation Summary: How to Use CDK Escape Hatches to Access L1 Constructs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- TypeScript
- AWS CloudFormation
- Amazon S3
- AWS Lambda
- Amazon DynamoDB
- Amazon VPC
- Amazon ECS

## Sources Consulted
- AWS CDK v2 Developer Guide: Customize constructs from the AWS Construct Library, https://docs.aws.amazon.com/cdk/v2/guide/cfn-layer.html
- AWS CDK v2 API Reference: `aws_s3.BucketProps`, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html
- AWS CDK v2 API Reference: `aws_s3.CfnBucket`, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.CfnBucket.html
- AWS CDK v2 API Reference: `aws_lambda.FunctionProps`, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionProps.html
- AWS CloudFormation Template Reference: `AWS::Lambda::Function RuntimeManagementConfig`, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-function-runtimemanagementconfig.html
- AWS CloudFormation Template Reference: `AWS::Lambda::Function`, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CDK v2 API Reference: `CfnResource.addPropertyOverride` and `addPropertyDeletionOverride`, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CfnResource.html
- TypeScript compile check against `aws-cdk-lib@2.257.0`, `constructs@10`, and `typescript@5`.

## Issues Found
- The post claimed S3 intelligent tiering was not exposed by the L2 `Bucket` construct. Current CDK v2 `BucketProps` includes `intelligentTieringConfigurations`, so the example was stale. Replaced it with the S3 bucket `abacStatus` CloudFormation property, which is available on `CfnBucket` and not exposed in `BucketProps`.
- The Lambda example used SnapStart with a Node.js runtime and stated it was a property the L2 construct did not support. Current CDK v2 exposes `snapStart` on `FunctionProps`, and SnapStart is not supported for Node.js runtimes. Replaced the example with a valid runtime override and a `RuntimeManagementConfig` property override using the valid `FunctionUpdate` mode.
- The DynamoDB array override example added `GlobalSecondaryIndexes.0.ProvisionedThroughput` to an on-demand table with no GSI. That would describe an invalid or misleading template shape. Replaced it with an index-based override of the existing `KeySchema` array.

## Review Notes
The edited examples were type-checked against `aws-cdk-lib@2.257.0`, and a small synth check confirmed the VPC child lookups used in the post. Some snippets intentionally omit surrounding imports and stack boilerplate, which is normal for a focused blog tutorial.
