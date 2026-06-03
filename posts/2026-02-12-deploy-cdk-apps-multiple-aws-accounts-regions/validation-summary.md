# Validation Summary: How to Deploy CDK Apps to Multiple AWS Accounts and Regions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- AWS CDK CLI bootstrapping and deployment
- AWS CDK Pipelines / AWS CodePipeline
- AWS IAM cross-account trust and permissions
- Amazon S3 bucket policies and grants
- AWS CloudFormation stack outputs and exports
- Amazon CloudFront and ACM certificates
- AWS Organizations / multi-account AWS environments

## Sources Consulted
- AWS CDK CLI `cdk bootstrap` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-bootstrap.html
- AWS CDK CLI `cdk deploy` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS CDK CLI reference for profiles and stack selection: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK `StackProps.env` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html
- AWS CDK Pipelines module reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines-readme.html
- AWS CDK `CodePipeline` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines.CodePipeline.html
- AWS CDK `CodePipelineSource` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines.CodePipelineSource.html
- AWS CDK permissions guide: https://docs.aws.amazon.com/cdk/v2/guide/permissions.html
- AWS IAM cross-account resource access guide: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- AWS CloudFormation `Fn::ImportValue` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html
- Amazon CloudFront custom domain and HTTPS certificate guide: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html

## Issues Found
- The production bootstrap example used `--qualifier prod` without showing the required matching stack synthesizer configuration. AWS CDK documentation states that when the bootstrap qualifier changes, the CDK app must pass the changed qualifier to the stack synthesizer. I removed the qualifier from the example because it was not needed for the custom execution policy example.
- The CDK Pipelines snippet used `ManualApprovalStep` without importing it. I added `ManualApprovalStep` to the import from `aws-cdk-lib/pipelines`.
- The CDK Pipelines snippet used `CodePipelineSource.gitHub`, which the current CDK API reference says is no longer the recommended method. I changed it to `CodePipelineSource.connection` with a placeholder CodeStar Connections ARN, matching current CDK Pipelines guidance.

## Review Notes
- The S3 cross-account example is technically valid as a simplified pattern: the shared account bucket policy delegates access to the target accounts, and `grantRead` adds identity-side permissions to the Lambda role in the consuming account. In production, granting account principals is broad; granting specific role ARNs is usually preferable.
- The `CfnOutput` export in the shared bucket example is only directly importable with `Fn::ImportValue` in the same account and Region. The post does not use `Fn::ImportValue` in the consuming example, so the code remains correct, but future revisions should avoid implying CloudFormation exports are a general cross-account reference mechanism.
