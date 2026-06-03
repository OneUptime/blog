# Validation Summary: How to Use CDK Stacks and Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CDK v2
- AWS CloudFormation
- TypeScript
- Amazon S3
- Amazon VPC
- Amazon RDS/Aurora PostgreSQL
- AWS CDK CLI

## Sources Consulted
- AWS CDK Developer Guide: Configure environments to use with the AWS CDK: https://docs.aws.amazon.com/cdk/v2/guide/configure-env.html
- AWS CDK Developer Guide: Introduction to AWS CDK stacks: https://docs.aws.amazon.com/cdk/v2/guide/stacks.html
- AWS CDK CLI command reference for `cdk deploy`: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS CloudFormation quotas: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
- AWS CDK troubleshooting guidance for CloudFormation resource limits: https://docs.aws.amazon.com/cdk/v2/guide/troubleshooting.html
- AWS CloudFormation cross-stack output references: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html
- AWS announcement for CloudFormation/CDK `Fn::GetStackOutput`: https://aws.amazon.com/about-aws/whats-new/2026/05/aws-cloudformation-cdk-stack/
- AWS CDK API reference for `ClusterInstance`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ClusterInstance.html
- AWS CDK Developer Guide: Tags and the AWS CDK: https://docs.aws.amazon.com/cdk/v2/guide/tagging.html

## Issues Found
- The post stated that CDK cross-stack references are handled using CloudFormation exports and imports under the hood. This is accurate for common same-account, same-region strong references, but current CloudFormation and CDK also support `Fn::GetStackOutput` for cross-account and cross-region output references. Updated the wording to describe stack outputs generally, preserve the export/import dependency warning where it applies, and mention current `Fn::GetStackOutput` behavior.
- The stack-size example said to check `cdk.out` for template size while discussing resource count. Updated the comment to say resource count and clarified that CDK warns when the stack exceeds 80% of the CloudFormation resource limit.

## Review Notes
The code examples are illustrative snippets and assume the surrounding imports and custom stack prop interfaces exist where omitted. The AWS CDK CLI commands and CDK v2 APIs used in the post are current as of 2026-06-03.
