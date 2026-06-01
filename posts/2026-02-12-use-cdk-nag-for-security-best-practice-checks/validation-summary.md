# Validation Summary: How to Use CDK Nag for Security and Best Practice Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- cdk-nag
- TypeScript
- AWS S3
- AWS VPC and security groups
- GitHub Actions

## Sources Consulted
- cdk-nag official README and examples: https://github.com/cdklabs/cdk-nag
- cdk-nag official API reference: https://github.com/cdklabs/cdk-nag/blob/main/API.md
- cdk-nag official rules reference: https://github.com/cdklabs/cdk-nag/blob/main/RULES.md
- cdk-nag NagPack developer documentation: https://github.com/cdklabs/cdk-nag/blob/main/docs/NagPack.md
- AWS CDK Aspects documentation: https://docs.aws.amazon.com/cdk/v2/guide/aspects.html
- AWS CDK CfnResource API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CfnResource.html
- AWS CDK S3 CfnBucket API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.CfnBucket.html
- AWS DevOps Blog cdk-nag overview: https://aws.amazon.com/blogs/devops/manage-application-security-and-compliance-with-the-aws-cloud-development-kit-and-cdk-nag/

## Issues Found
- The introduction said cdk-nag catches unencrypted S3 buckets. The current AWS Solutions S3 examples in the post map to access logging, public access, website access, and SSL enforcement, so this was changed to "S3 buckets without access logging."
- The explanation said aspects walk through a CloudFormation template. AWS CDK aspects visit the construct tree, so the wording now says cdk-nag checks generated CloudFormation resources through the construct tree.
- The basic setup and S3 examples assigned constructs to unused variables. This can fail projects using `noUnusedLocals`, so they now instantiate those constructs without assignment where the variable is not reused.
- The insecure stack imported RDS and described an RDS problem without creating an RDS resource. The unused import and misleading comment were removed, and the example now identifies the actual VPC flow log finding.
- The findings list omitted `AwsSolutions-VPC7`, which cdk-nag flags for a VPC without flow logs. The list and remediation snippet now include VPC flow logs.
- The custom rule example was not a runnable cdk-nag rule pack and referenced tag access that is not valid on the generic `CfnResource` type. It was replaced with a `NagPack` subclass using `applyRule` and `s3.CfnBucket.isCfnBucket`.

## Review Notes
The TypeScript APIs used in the examples were checked against `aws-cdk-lib@2.257.0`, `cdk-nag@2.38.2`, and TypeScript compilation. The reporting options shown are accepted by the current cdk-nag package, although pre-built NagPacks already include CSV report logging by default.
