# Validation Summary: How to Use the filemd5 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform HCL
- Terraform file and hash functions
- AWS S3 objects and ETags
- AWS CloudFront distributions and cache policies
- AWS ECS task definitions

## Sources Consulted
- HashiCorp Terraform `filemd5` function documentation: https://developer.hashicorp.com/terraform/language/functions/filemd5
- HashiCorp Terraform `md5` function documentation: https://developer.hashicorp.com/terraform/language/functions/md5
- HashiCorp Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- HashiCorp Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- HashiCorp Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform AWS provider `aws_s3_object` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- Terraform AWS provider `aws_cloudfront_distribution` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider `aws_cloudfront_cache_policy` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudfront_cache_policy
- Terraform AWS provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Amazon S3 object integrity and ETag documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html
- Amazon CloudFront managed cache policies documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html

## Issues Found
- The post described S3 ETags too broadly as MD5 hashes. Updated the introduction, S3 section, and summary to clarify that S3 ETags are MD5 digests only for qualifying non-multipart plaintext or SSE-S3 objects, and that SSE-KMS or multipart-uploaded objects can have non-MD5 ETags.
- Added guidance to use `source_hash` for `aws_s3_object` when S3 ETags are not MD5 digests, matching the Terraform AWS provider documentation.
- The content type lookup examples used `regex("\\.[^.]+$", each.value)` directly, which fails for files without extensions. Wrapped the expression with `try(..., "")` so extensionless files fall back to `application/octet-stream`.
- The static website snippet referenced `local.content_types` without defining it in that section. Added the missing content type map.
- The CloudFront example used deprecated `forwarded_values`. Replaced it with the `aws_cloudfront_cache_policy` data source and `cache_policy_id`.
- The CloudFront S3 origin example omitted an S3 origin configuration. Added `s3_origin_config` to make the origin block valid for an S3 origin.
- The CloudFront comment suggested Terraform would trigger invalidations from a distribution comment. Revised the wording to avoid implying that changing the comment creates a CloudFront invalidation.

## Review Notes
Terraform was not installed in the local environment, so `terraform validate` could not be run. The review was completed against official Terraform, Terraform AWS provider, AWS S3, and AWS CloudFront documentation.
