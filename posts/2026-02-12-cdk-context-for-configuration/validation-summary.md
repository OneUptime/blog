# Validation Summary: How to Use CDK Context for Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CDK v2
- AWS CDK CLI
- TypeScript
- AWS CloudFormation parameters
- Amazon VPC
- Amazon EC2 AMI lookups
- Amazon Route 53 hosted zone lookups
- Amazon EC2 security group lookups

## Sources Consulted
- AWS CDK Developer Guide: Context values and the AWS CDK: https://docs.aws.amazon.com/cdk/v2/guide/context.html
- AWS CDK CLI command reference for `cdk context`: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-context.html
- AWS CDK CLI reference: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK Developer Guide: Parameters and the AWS CDK: https://docs.aws.amazon.com/cdk/v2/guide/parameters.html
- AWS CDK API reference for `Vpc.fromLookup`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
- AWS CDK API reference for `LookupMachineImage`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.LookupMachineImage.html
- AWS CDK API reference for `SecurityGroup.fromLookupByName`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.SecurityGroup.html
- AWS CDK feature flags documentation: https://docs.aws.amazon.com/cdk/v2/guide/featureflags.html

## Issues Found
- The description referred to CDK context lookups as runtime lookups. Updated it to synthesis-time lookups because CDK context lookups are performed during synthesis and cached in `cdk.context.json`.
- The post introduced context sources as an order of precedence, but the official CDK documentation describes a broader set of context sources rather than the shortened list in the post as a precedence list. Updated the wording to "Sources of Context Values" and removed the precedence claim.
- The command-line context section did not mention that `-c`/`--context` values are always strings. Added a clarification that structured data such as JSON must be parsed by the CDK app before use as an object.
- The cache management section did not state the scope of `cdk context --reset` and `cdk context --clear`. Added that these commands only remove cached values from `cdk.context.json` and do not remove values from `cdk.json`.

## Review Notes
The code snippets are illustrative and omit surrounding imports or required resource properties in a few places. The AWS CDK v2 APIs, CLI flags, context cache behavior, and CloudFormation parameter guidance used in the post are current as of 2026-06-03.
