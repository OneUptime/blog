# Validation Summary: How to Set Up IAM Policies for State File Access Control in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- Amazon S3
- Amazon DynamoDB
- AWS KMS
- GitHub Actions OIDC
- HCL

## Sources Consulted
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state locking docs: https://opentofu.org/docs/language/state/locking/
- AWS IAM JSON policy grammar: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html
- AWS IAM `Action` element docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html
- AWS IAM `Resource` element docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_resource.html
- AWS S3 condition key examples (`s3:prefix`): https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- AWS IAM OIDC role docs, including GitHub trust policy guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- GitHub Actions OIDC for AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws?apiVersion=2022-11-28

## Issues Found
- The DynamoDB locking policy omitted `dynamodb:DescribeTable`, which OpenTofu documents as required for the S3 backend when DynamoDB locking is enabled. I added that action.
- The KMS example omitted `kms:Encrypt` and included `kms:DescribeKey` instead of the minimum permissions OpenTofu documents for `kms_key_id`. I changed the snippet to `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey`.
- The "Full IAM Role for a CI/CD Pipeline" example only attached the S3 policy, so it did not actually grant the DynamoDB locking or optional KMS permissions described elsewhere in the post. I added separate inline policy examples for DynamoDB locking and optional customer-managed KMS access.
- The plan/apply split example used invalid IAM JSON keys (`Actions` and `Resources`) instead of `Action` and `Resource`. I corrected the JSON structure to match AWS IAM policy syntax.
- The plan/apply split example scoped `s3:ListBucket` and `s3:GetObject` to the wrong ARN shapes in the same statement. I split bucket-level and object-level permissions so `s3:ListBucket` uses the bucket ARN and `s3:GetObject` uses the object ARN.
- The `apply_state` example was incomplete because the `aws_iam_role_policy` block had no `policy` argument. I added the missing `policy` attribute.
- The S3 prefix condition only matched child paths under the prefix. I expanded it to allow both the exact prefix and nested paths so the list permission is less likely to over-restrict valid backend requests.

## Review Notes
- The post remains technically valid for OpenTofu's DynamoDB-based S3 backend locking flow. OpenTofu also supports native S3 lockfiles via `use_lockfile`, but that is a separate locking path from the one covered here.
- The snippets were reviewed against current documentation and patched for correctness, but they were not executed against a live AWS account in this repository.
