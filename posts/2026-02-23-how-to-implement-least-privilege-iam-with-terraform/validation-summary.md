# Validation Summary: How to Implement Least Privilege IAM with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IAM policies, roles, permission boundaries, and conditions
- Amazon S3 IAM permissions and condition keys
- Amazon DynamoDB IAM permissions
- Amazon EC2 tag-based authorization
- AWS IAM Access Analyzer

## Sources Consulted
- Terraform AWS Provider `aws_iam_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform AWS Provider `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider `aws_iam_role_policy_attachment` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Terraform AWS Provider `aws_accessanalyzer_analyzer` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/accessanalyzer_analyzer
- AWS IAM JSON policy condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS global condition context keys, including `aws:MultiFactorAuthPresent`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS Service Authorization Reference for Amazon S3 actions and condition keys: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS Service Authorization Reference for Amazon EC2 actions and condition keys: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS Service Authorization Reference for Amazon DynamoDB actions and resources: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondynamodb.html
- IAM Access Analyzer findings documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings.html
- IAM Access Analyzer `CreateAnalyzer` API reference: https://docs.aws.amazon.com/access-analyzer/latest/APIReference/API_CreateAnalyzer.html
- Amazon S3 `PutPublicAccessBlock` API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutPublicAccessBlock.html
- Amazon S3 `DeletePublicAccessBlock` API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeletePublicAccessBlock.html

## Issues Found
- The Access Analyzer section said the tool can identify unused permissions, but the Terraform example created a default `ACCOUNT` analyzer, which is for external access findings rather than unused access findings. Changed the analyzer to `ACCOUNT_UNUSED_ACCESS` and updated the analyzer name and surrounding sentence.
- The S3 ABAC example used `s3:ExistingObjectTag/Project` for both `s3:GetObject` and `s3:PutObject`. AWS documents `s3:ExistingObjectTag` for read/tagging operations, while `s3:PutObject` supports request object tag condition keys. Split the statement into read and write statements, using `s3:ExistingObjectTag/Project` for reads and `s3:RequestObjectTag/Project` for writes.
- The S3 guardrail example used unsupported condition keys under `s3:PutBucketPublicAccessBlock`. Replaced the invalid conditional deny with a straightforward deny of `s3:PutBucketPublicAccessBlock` on bucket ARNs to prevent changes to bucket Public Access Block configuration.

## Review Notes
The remaining examples are illustrative snippets and reference roles or trust policies that are not fully defined in the post. The IAM actions, Terraform resource names, policy JSON structure, interpolation escaping for IAM policy variables, and referenced internal links were otherwise consistent with the official documentation reviewed.
