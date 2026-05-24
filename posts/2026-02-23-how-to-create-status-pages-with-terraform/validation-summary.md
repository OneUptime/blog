# Validation Summary: How to Create Status Pages with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS S3 (static website hosting)
- AWS CloudFront (CDN)
- AWS DynamoDB
- AWS Lambda (Python 3.11)
- AWS IAM
- AWS SNS
- AWS Route 53
- AWS ACM

## Sources Consulted
- Terraform AWS Provider v5 docs (registry.terraform.io/providers/hashicorp/aws/latest/docs)
- `aws_s3_bucket_website_configuration` — confirms `website_endpoint` attribute
- `aws_s3_bucket_public_access_block` — argument names and types
- `aws_s3_bucket_policy` — JSON policy structure
- `aws_cloudfront_distribution` — `origin`, `custom_origin_config`, `forwarded_values` (deprecated but still supported), `viewer_certificate`, `restrictions`, `hosted_zone_id` attribute
- `aws_dynamodb_table` — `billing_mode`, `hash_key`/`range_key`, `attribute` block syntax
- `aws_lambda_function` — `runtime`, `handler`, `filename`, `source_code_hash` semantics
- AWS Lambda supported runtimes (Python 3.11 still supported as of 2026-05)
- `aws_iam_role` / `aws_iam_role_policy` assume-role JSON structure
- `aws_sns_topic_subscription` / `aws_lambda_permission` for SNS→Lambda invocation
- `aws_route53_record` alias block for CloudFront targets
- AWS docs on S3 website endpoints (HTTP-only, hence `origin_protocol_policy = "http-only"`)

## Issues Found
No technical issues found. All Terraform resource types, argument names, attribute references, and JSON policy documents are syntactically correct and would apply successfully with AWS provider v5.x. The IAM trust policy for Lambda, the SNS→Lambda permission with `source_arn`, and the Route 53 alias targeting CloudFront's `domain_name`/`hosted_zone_id` are all idiomatic.

## Review Notes
- `forwarded_values` in `aws_cloudfront_distribution.default_cache_behavior` is deprecated; AWS recommends migrating to `cache_policy_id` (and optionally `origin_request_policy_id`). The deprecated block still works and is widely used, so it was left unchanged.
- `viewer_certificate` does not set `minimum_protocol_version`. The provider default is `TLSv1`, which is older than recommended; production users should consider `TLSv1.2_2021`. Not a correctness issue.
- `aws_s3_bucket_public_access_block` with all four flags set to `false` is required for a public S3 website bucket; this is correctly accompanied by an explicit `depends_on` from the bucket policy.
- Python 3.11 is still a supported Lambda runtime as of the validation date, though Python 3.12 and 3.13 are also available.
- The example assumes the ACM certificate is in `us-east-1` (required for CloudFront) — not stated explicitly but implied by the provider region.
