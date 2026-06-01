# Validation Summary: How to Write Unit Tests for CDK Stacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- AWS CDK assertions library
- AWS CloudFormation resource templates
- AWS Lambda
- Amazon DynamoDB
- Amazon S3
- IAM policies
- CloudWatch alarms
- Jest
- ts-jest
- TypeScript

## Sources Consulted
- AWS CDK v2 Developer Guide, testing CDK applications: https://docs.aws.amazon.com/cdk/v2/guide/testing.html
- AWS CDK v2 API Reference, `Template`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- AWS CDK v2 API Reference, `Match`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Match.html
- AWS CDK v2 API Reference, Lambda `Runtime`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CloudFormation Template Reference, `AWS::Lambda::Function`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CloudFormation Template Reference, `AWS::CloudWatch::Alarm`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- AWS CloudFormation Template Reference, `AWS::DynamoDB::Table`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html
- Jest CLI Options: https://jestjs.io/docs/cli
- Jest Configuration: https://jestjs.io/docs/configuration
- Jest 30 Upgrade Guide: https://jestjs.io/docs/upgrading-to-jest30
- ts-jest Installation Guide: https://kulshekhar.github.io/ts-jest/docs/getting-started/installation

## Issues Found
- The testing dependency install command omitted `typescript`, which is listed as a required `ts-jest` dependency. Updated the command to install `jest typescript ts-jest @types/jest`.
- The Jest command used `--testPathPattern`, which was renamed to `--testPathPatterns` in Jest 30. Updated the command to the current flag.
- The S3 resource count example claimed that zero `AWS::S3::BucketPolicy` resources ensures no public S3 buckets were created. That assertion only checks bucket policy resources, not every possible public bucket configuration. Updated the test name and comment to describe what the assertion actually verifies.
- The final section title and introduction said it was finding resources by logical ID, but the example uses `findResources` by type and then reads logical IDs from the result keys. Updated the heading and introductory sentence to match the API behavior.

## Review Notes
The CDK assertions APIs, matchers, CloudFormation property names, Lambda runtime value, CloudWatch alarm examples, DynamoDB deletion protection property, and output assertions were consistent with the official documentation reviewed. The `ts-jest` transform-based Jest configuration remains valid, though the current `ts-jest` docs also show generated/preset-based configuration options.
