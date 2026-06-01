# Validation Summary: How to Write Your First CloudFormation Template

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- Amazon S3
- AWS Identity and Access Management (IAM)
- AWS CLI
- YAML
- JSON

## Sources Consulted
- AWS CloudFormation template format documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-formats.html
- AWS CloudFormation Resources section documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resources-section-structure.html
- AWS CloudFormation AWSTemplateFormatVersion documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/format-version-structure.html
- AWS CloudFormation AWS::S3::Bucket resource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html
- AWS CloudFormation AWS::S3::Bucket VersioningConfiguration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-versioningconfiguration.html
- AWS CloudFormation AWS::S3::Bucket PublicAccessBlockConfiguration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-publicaccessblockconfiguration.html
- AWS CloudFormation AWS::S3::BucketPolicy resource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucketpolicy.html
- AWS CloudFormation AWS::IAM::Role resource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html
- AWS CloudFormation Ref intrinsic function reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html
- AWS CloudFormation Fn::GetAtt intrinsic function reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html
- AWS CloudFormation Fn::Sub intrinsic function reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-sub.html
- AWS CloudFormation DependsOn documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html
- AWS CLI cloudformation create-stack command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html
- AWS CLI cloudformation wait stack-create-complete command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/wait/stack-create-complete.html
- AWS CLI cloudformation validate-template command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/validate-template.html

## Issues Found
- The post said the bucket policy makes the bucket private. In the shown template, the public access block settings are what block public access, while the bucket policy grants the IAM role read access. Updated the sentence to describe public access block settings, bucket policy, and IAM role accurately.
- The parameterized template explanation said CloudFormation would ask for `Environment` and `BucketSuffix` values. That is true in console-style workflows, but the CLI example requires values to be provided explicitly. Updated the sentence to say the user provides the values.
- The deployment command included `--parameters`, which applies to the parameterized template rather than the earlier hard-coded S3 template. Updated the command comment to clarify that it deploys the parameterized template.

## Review Notes
- The example with an explicit IAM `RoleName` would require acknowledging IAM capabilities if deployed with `create-stack`, but the provided deployment command is for the parameterized S3-only template and does not create IAM resources.
- The example bucket names are syntactically valid, but S3 bucket names must be globally unique, so readers may need to change the suffix if a name is already taken.
