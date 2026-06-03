# Validation Summary: How to Use CDK Custom Resources for Advanced Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- AWS CloudFormation custom resources
- AWS CDK custom-resources `AwsCustomResource`
- AWS CDK custom-resources `Provider` framework
- AWS Lambda
- Amazon S3
- AWS Systems Manager Parameter Store
- Python custom resource handlers
- TypeScript CDK applications

## Sources Consulted
- AWS CDK API Reference: `AwsCustomResourceProps` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources.AwsCustomResourceProps.html
- AWS CDK API Reference: `AwsSdkCall` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources.AwsSdkCall.html
- AWS CDK API Reference: `Provider` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources.Provider.html
- AWS CDK Custom Resources README / Provider Framework - https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.custom_resources/README.html
- AWS CloudFormation custom resources user guide - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html
- AWS CloudFormation `AWS::S3::Bucket AccelerateConfiguration` reference - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-accelerateconfiguration.html
- Amazon EC2 User Guide: Reference latest AMIs using Systems Manager public parameters - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html
- AWS Systems Manager User Guide: Calling AMI public parameters in Parameter Store - https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-public-parameters-ami.html

## Issues Found
- The first `AwsCustomResource` example claimed S3 Transfer Acceleration was not natively supported by CloudFormation. Current CloudFormation supports `AWS::S3::Bucket AccelerateConfiguration`, and CDK exposes it through S3 bucket constructs/L1 properties. I changed the example wording to describe configuring an existing bucket managed outside the stack instead of claiming a CloudFormation support gap.
- The first TypeScript snippet imported `aws-iam` but did not use it. I removed the unused import so the example is clean under TypeScript configurations that check unused locals.
- The AMI lookup example used `EC2.describeImages` and read `Images.0.ImageId` as the "latest" AMI. The EC2 response is not sorted by creation date in that snippet, so the first image is not guaranteed to be the latest. I replaced it with an SSM public parameter lookup for the Amazon Linux 2 AMI and changed `getResponseField` to read `Parameter.Value`.
- The error-handling section said an unhandled Lambda exception makes CloudFormation wait an hour before timing out. That is true for raw custom resource handlers that do not send a response, but the CDK Provider framework sends a failed response when `onEvent` throws. I changed the wording to clarify that the timeout risk applies when no framework or response path sends the failure response.

## Review Notes
- The Provider framework examples align with AWS CDK's documented `onEventHandler`, optional `isCompleteHandler`, `queryInterval`, `totalTimeout`, `PhysicalResourceId`, `Data`, and `IsComplete` behavior.
- The post's advice to avoid failing delete handlers is a pragmatic operational pattern, although there are cases where surfacing delete failure may be preferable if silent cleanup failure would leave unacceptable external state.
