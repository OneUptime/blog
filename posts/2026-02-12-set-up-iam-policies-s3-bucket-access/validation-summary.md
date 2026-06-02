# Validation Summary: How to Set Up IAM Policies for S3 Bucket Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- Amazon S3 bucket policies and identity-based policies
- Amazon S3 condition keys
- AWS KMS server-side encryption for S3
- AWS CLI IAM policy simulator
- Amazon VPC endpoints for S3

## Sources Consulted
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon S3: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Amazon S3 User Guide: Identity-based policy examples for Amazon S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html
- Amazon S3 User Guide: Examples of Amazon S3 bucket policies: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Amazon S3 User Guide: Bucket policy examples using condition keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Amazon S3 User Guide: Controlling access from VPC endpoints with bucket policies: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html
- Amazon VPC User Guide: Gateway endpoints for Amazon S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- AWS IAM User Guide: Cross account resource access in IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- AWS IAM User Guide: Cross-account policy evaluation logic: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html
- AWS CLI Command Reference: iam simulate-principal-policy: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html

## Issues Found
- The post said mixing bucket and object ARNs in one statement does not work as expected. AWS policy syntax allows multiple actions and multiple resources in one statement as long as the required resource type for each action is included. Updated the explanation to say that separate statements improve clarity and reduce mistakes, rather than being mandatory.
- The encryption example combined an identity-style allow with a deny intended to enforce KMS encryption. AWS's recommended enforcement pattern is a bucket-policy Deny that applies to all principals. Removed the allow statement, added `Principal: "*"`, and clarified that a separate allow is still required.
- The cross-account section implied that a bucket policy alone is enough for direct cross-account access. AWS IAM cross-account evaluation requires both the resource-based policy in the trusting account and an identity-based allow for the principal in the trusted account. Added that requirement while preserving the bucket policy example.
- The common mistakes section described "mixing bucket and object ARNs in one statement" as the mistake. Updated it to the technically accurate issue: using the wrong ARN type for an S3 action.

## Review Notes
- The AWS CLI command syntax for `aws iam simulate-principal-policy` matches the current AWS CLI command reference, but the AWS CLI was not installed locally, so this was verified against official documentation rather than local `--help` output.
- The VPC endpoint restriction policy is technically correct, but AWS warns that these policies can block console access and can lock out users if the VPC endpoint ID is wrong.
- S3 now applies SSE-S3 by default to new object uploads. The encryption section remains valid because it specifically enforces SSE-KMS, which is stronger and distinct from default SSE-S3.
