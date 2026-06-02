# Validation Summary: How to Migrate from CloudFormation to CDK

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS CDK v2
- AWS CloudFormation
- CDK CLI
- AWS CLI
- TypeScript
- Amazon S3
- Amazon VPC
- AWS Systems Manager Parameter Store
- CloudFormation drift detection

## Sources Consulted
- AWS CDK Developer Guide: Migrate existing resources and AWS CloudFormation templates to the AWS CDK - https://docs.aws.amazon.com/cdk/v2/guide/migrate.html
- AWS CDK CLI Command Reference: `cdk migrate` - https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cdk-migrate.html
- AWS CDK API Reference: `cloudformation_include.CfnInclude` - https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.cloudformation_include/CfnInclude.html
- AWS CDK API Reference: `aws_s3.Bucket` and `BucketProps` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
- AWS CDK API Reference: `aws_ec2.Vpc.fromLookup` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
- AWS CDK API Reference: `aws_ssm.StringParameter.valueFromLookup` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm.StringParameter.html
- AWS CDK CLI Command Reference: `cdk diff` - https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-diff.html
- AWS CloudFormation User Guide: Import AWS resources into a CloudFormation stack manually - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/import-resources-manually.html
- AWS CloudFormation User Guide: Creating a stack from existing resources - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-new-stack.html
- AWS CloudFormation User Guide: Importing existing resources into a stack - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-existing-stack.html
- AWS CLI Command Reference: `cloudformation create-change-set` - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html

## Issues Found
- The `cdk migrate` section did not mention that AWS documents CDK Migrate as preview/experimental. Added a caveat so readers know the command may change.
- The L2 S3 bucket example implied the rewritten construct was simply shorter and used sensible defaults, even though `enforceSSL` and `blockPublicAccess` add resource properties compared with the L1 example. Updated the explanation to say these are higher-level settings that can change the synthesized template.
- The CloudFormation import workflow omitted the required `DeletionPolicy`/retain requirement for imported resources. Updated Step 1 and the import explanation to include this requirement.
- The CloudFormation import explanation said every property had to match exactly. Replaced that with AWS's documented requirements: describe the current resource configuration, include a `DeletionPolicy`, and provide resource identifiers that map existing resources to template logical IDs.
- The SSM/VPC sharing TypeScript snippet used `ec2.Vpc.fromLookup` without importing the EC2 module. Added the missing import.
- The SSM/VPC sharing snippet did not mention that `valueFromLookup` and `Vpc.fromLookup` run at synthesis time. Added the account/Region and `cdk.context.json` caveat from the CDK docs.

## Review Notes
The local AWS CLI and CDK CLI were not installed in this workspace, so command validation was performed against current official AWS documentation rather than local `--help` output. The linked OneUptime internal posts referenced at the end of the article exist in the repository.
