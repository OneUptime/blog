# Validation Summary: How to Set Up S3 Batch Operations with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- Amazon S3 Batch Operations
- Amazon S3 Inventory
- AWS CLI `s3control create-job`
- AWS Lambda
- Python and boto3

## Sources Consulted
- AWS S3 User Guide: Granting permissions for Batch Operations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-iam-role-policies.html
- AWS S3 User Guide: Creating an S3 Batch Operations job - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-create-job.html
- AWS CLI Command Reference: `s3control create-job` - https://docs.aws.amazon.com/cli/latest/reference/s3control/create-job.html
- AWS S3 User Guide: Configuring Amazon S3 Inventory - https://docs.aws.amazon.com/AmazonS3/latest/userguide/configure-inventory.html
- AWS S3 User Guide: Invoke AWS Lambda function - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-invoke-lambda.html
- AWS Lambda Developer Guide: Invoke a Lambda function with Amazon S3 batch events - https://docs.aws.amazon.com/lambda/latest/dg/services-s3-batch.html
- Terraform AWS Provider documentation source: `aws_s3_bucket_inventory` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_inventory.html.markdown
- Terraform AWS Provider documentation source: `aws_s3control_object_lambda_access_point` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3control_object_lambda_access_point.html.markdown
- OpenTofu CLI documentation - https://opentofu.org/docs/cli/commands/

## Issues Found
- The IAM policy used `s3:CopyObject`, which is not an IAM action. Replaced it with the S3 permissions AWS documents for Batch Operations copy jobs, including source read/list permissions and destination write/tag/ACL permissions.
- The prerequisites did not call out `s3:CreateJob`, `iam:PassRole`, or the need for an already delivered S3 Inventory manifest. Updated the prerequisites to match the create-job flow.
- The S3 Inventory example was missing the destination bucket policy required when inventory is configured through API-based tooling such as OpenTofu. Added an `aws_s3_bucket_policy` and an explicit dependency from the inventory configuration.
- The Step 3 placeholder used `aws_s3control_object_lambda_access_point`, which manages S3 Object Lambda Access Points and would fail validation without required arguments. Removed the invalid placeholder.
- The AWS CLI operation payload used `S3CopyObject`; the correct Batch Operations operation key is `S3PutObjectCopy`. Updated the payload and aligned the manifest format with S3 Inventory reports.
- The create-job snippet referenced the current AWS account without declaring the caller identity data source. Added `data "aws_caller_identity" "current" {}`.
- The Lambda example did not URL-decode Batch Operations object keys, used brittle bucket ARN parsing, ignored version IDs, and hardcoded the response schema version. Updated the example to follow AWS's event and response contract.
- The Lambda example did not mention that the Lambda execution role needs S3 tagging permissions. Added the required permission note.

## Review Notes
The post is now technically valid as a focused tutorial, but the snippets still assume the referenced variables, buckets, Lambda function, AWS CLI, and provider configuration already exist. S3 Inventory reports are delivered asynchronously, so the Batch Operations job can only be created after the inventory `manifest.json` and ETag are available.
