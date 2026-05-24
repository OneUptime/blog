# Validation Summary: How to Create Resource-Based Policies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (AWS provider)
- AWS IAM (resource-based policies)
- Amazon S3 (bucket policies)
- Amazon SQS (queue policies)
- Amazon SNS (topic policies)
- AWS KMS (key policies)
- AWS Lambda (function permissions / resource-based policies via `aws_lambda_permission`)
- AWS Secrets Manager (secret resource policies)
- HCL (`jsonencode`, `aws_iam_policy_document` data source)

## Sources Consulted
- Terraform AWS provider docs — `aws_s3_bucket_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- Terraform AWS provider docs — `aws_sqs_queue_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Terraform AWS provider docs — `aws_sns_topic_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- Terraform AWS provider docs — `aws_kms_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- Terraform AWS provider docs — `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider docs — `aws_secretsmanager_secret_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_policy
- Terraform AWS provider docs — `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS IAM User Guide — Identity-based vs. resource-based policies: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html
- AWS S3 — Bucket policy examples (HTTPS-only via `aws:SecureTransport`, encryption via `s3:x-amz-server-side-encryption`): https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- AWS KMS — Key policies: https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- AWS Service Authorization Reference for SNS, SQS, S3, KMS, Lambda, Secrets Manager

## Issues Found
No technical issues found. All resource arguments, data source attributes, action names, condition keys, and policy structures match the current Terraform AWS provider and AWS service documentation. Verified items include:

- `aws_s3_bucket_policy` uses `bucket` + `policy` (correct).
- `aws_sqs_queue_policy` uses `queue_url` + `policy` (correct).
- `aws_sns_topic_policy` uses `arn` + `policy` (correct).
- `aws_secretsmanager_secret_policy` uses `secret_arn` + `policy` (correct).
- `aws_lambda_permission` correctly uses `statement_id`, `action`, `function_name`, `principal`, `source_arn`.
- `aws_iam_policy_document` blocks (`statement`, `principals`, `actions`, `resources`, `condition`) and their attribute names (`type`, `identifiers`, `test`, `variable`, `values`) are correct.
- S3 condition keys `s3:x-amz-server-side-encryption` and `aws:SecureTransport` are valid.
- `aws:SourceArn` is the correct global condition key for scoping service principals.
- Policy semantics (same-account OR evaluation, cross-account AND evaluation) match AWS IAM evaluation logic.

## Review Notes
- The post references the `nodejs18.x` Lambda runtime. As of late 2025, AWS has deprecated Node.js 18 (no longer receives security updates and is in the block-create/update phase by 2026). The runtime still works for existing functions, and the example is illustrative of resource-based policies (not Node.js), but readers creating new functions in 2026 should use `nodejs20.x` or `nodejs22.x`. Not changed because runtime choice is incidental to the topic.
- `sns:Receive` (used in the SNS subscribe statement) is a legacy action that AWS has effectively removed from the current Service Authorization Reference. It is still accepted in policies as a no-op and remains in many AWS sample policies, so it does not cause apply errors. Left in place to match common templates.
- The KMS key example relies on `data.aws_caller_identity.current.account_id`; readers should make sure the provider region/account matches the intent before applying.
- The Lambda example references `aws_iam_role.lambda_role.arn` without showing the role definition — this is fine for an illustrative snippet but readers will need to supply the role themselves.
- Best-practice recommendations (HTTPS enforcement, source-ARN scoping, careful cross-account grants) align with AWS Well-Architected security guidance.
