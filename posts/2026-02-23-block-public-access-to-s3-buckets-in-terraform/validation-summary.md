# Validation Summary: How to Block Public Access to S3 Buckets in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon S3
- S3 Block Public Access
- Amazon CloudFront Origin Access Control
- AWS Config
- AWS CLI
- IAM Access Analyzer

## Sources Consulted
- Amazon S3 User Guide: Blocking public access to your Amazon S3 storage: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS S3 Block Public Access feature page: https://aws.amazon.com/s3/features/block-public-access/
- Terraform Registry: aws_s3_bucket_public_access_block resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform Registry: aws_s3_account_public_access_block resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_account_public_access_block
- Terraform Registry: aws_cloudfront_distribution resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform Registry: aws_cloudfront_origin_access_control resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- Terraform Registry: aws_cloudfront_cache_policy data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudfront_cache_policy
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront Developer Guide: Use managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS Config Developer Guide: s3-bucket-public-read-prohibited: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html
- AWS Config Developer Guide: s3-bucket-public-write-prohibited: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-write-prohibited.html
- AWS CLI Command Reference: accessanalyzer list-findings: https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/list-findings.html
- AWS CLI Command Reference: s3control get-public-access-block: https://docs.aws.amazon.com/cli/latest/reference/s3control/get-public-access-block.html

## Issues Found
- The CloudFront example used the deprecated `forwarded_values` block in `aws_cloudfront_distribution`. Replaced it with the current `cache_policy_id` argument using the AWS-managed `Managed-CachingOptimized` cache policy data source.
- The CloudFront Origin Access Control example did not grant CloudFront permission to read from the private S3 bucket, so the distribution would be created but would receive access denied responses from S3. Added a non-public S3 bucket policy that allows the CloudFront service principal to read objects only when the request comes from the distribution ARN.

## Review Notes
The S3 Block Public Access settings, account-level and bucket-level Terraform resources, AWS Config managed rule identifiers, and AWS CLI commands are technically correct. The public static website example intentionally relaxes policy-related public access blocking; for production, the post correctly recommends CloudFront with a private bucket instead.
