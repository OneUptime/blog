# Validation Summary: How to Fix 'InvalidParameterValue' Errors in AWS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS CLI
- Amazon EC2
- AWS Lambda
- Amazon S3
- Amazon RDS
- AWS CloudFormation
- Boto3 for Python
- AWS ARNs

## Sources Consulted
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: lambda create-function - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- Amazon S3 bucket naming rules - https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS CLI Command Reference: s3 cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Amazon S3 CopyObject API Reference - https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
- AWS IAM User Guide: Identify AWS resources with ARNs - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- Amazon S3 IAM integration and bucket ARN examples - https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html
- AWS CloudFormation Parameters syntax - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html

## Issues Found
- The ARN section labeled `arn:aws:s3:::my-bucket` as wrong because it was "missing account ID." This is incorrect for an S3 bucket ARN. Changed the example to show a missing account ID on an EC2 ARN, kept the EC2 service-name typo example, used a 12-digit account ID, and added the S3 bucket ARN as a correct example.
- The Lambda runtime check used `aws lambda list-layers --compatible-runtime python3.12`, which lists Lambda layers compatible with a runtime rather than the valid runtime values for functions. Changed it to inspect the `--runtime` valid values in `aws lambda create-function help`.
- The S3 bucket naming summary said bucket names must start with a letter or number. AWS also requires general purpose bucket names to end with a letter or number, so the line was corrected.

## Review Notes
The post uses placeholder resource IDs such as `ami-abc123`, `sg-abc123`, and `i-abc123` for demonstration. These must be replaced with real resource IDs before running the commands. The local environment did not have the AWS CLI installed, so CLI behavior was verified against official AWS CLI documentation rather than local `--help` output.
