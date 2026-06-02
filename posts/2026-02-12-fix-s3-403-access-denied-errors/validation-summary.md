# Validation Summary: How to Fix S3 '403 Access Denied' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon S3
- AWS IAM
- S3 bucket policies and ACLs
- S3 Block Public Access
- S3 Object Ownership
- AWS KMS SSE-KMS encryption
- Amazon VPC endpoint policies
- AWS CloudTrail data events
- AWS CLI

## Sources Consulted
- AWS S3 User Guide: Troubleshoot access denied (403 Forbidden) errors in Amazon S3 - https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-403-errors.html
- AWS IAM User Guide: Policy evaluation logic and explicit deny behavior - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html
- AWS IAM User Guide: Explicit and implicit denies - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_AccessPolicyLanguage_Interplay.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS S3 User Guide: Controlling ownership of objects and disabling ACLs for your bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- AWS S3 User Guide: Blocking public access to your Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS S3 User Guide: Using server-side encryption with AWS KMS keys (SSE-KMS) - https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- AWS VPC User Guide: Control access to VPC endpoints using endpoint policies - https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html
- AWS S3 User Guide: Amazon S3 CloudTrail events - https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html
- AWS CloudTrail User Guide: Logging data events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
- AWS CLI Command Reference: iam simulate-principal-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CLI Command Reference: s3api get-public-access-block - https://docs.aws.amazon.com/cli/latest/reference/s3api/get-public-access-block.html

## Issues Found
- The post said S3 403 errors tell you almost nothing. AWS now provides enhanced access denied messages for same-account requests and requests within the same AWS Organization, while cross-account requests outside the organization and some other cases remain generic. Updated the introduction to reflect that nuance.
- The Block Public Access section implied `BlockPublicPolicy` blocks an existing public bucket policy at access time. AWS documents that `BlockPublicPolicy` rejects public `PutBucketPolicy` changes, while `RestrictPublicBuckets` restricts access to buckets with public policies. Updated the explanation to distinguish those settings.
- The Object Ownership section stated that cross-account uploaders own objects by default. New S3 buckets now default to `BucketOwnerEnforced`, so that statement is only true for older buckets or buckets using ACL-enabled `ObjectWriter` ownership. Added the current default and narrowed the claim.
- The KMS section covered `kms:Decrypt` for reads and `kms:GenerateDataKey` for writes, but omitted that SSE-KMS multipart uploads also require `kms:Decrypt`. Added that caveat.

## Review Notes
The AWS CLI commands and JSON policy examples are syntactically plausible and match current AWS CLI/API shapes. The local environment did not have the AWS CLI installed, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
