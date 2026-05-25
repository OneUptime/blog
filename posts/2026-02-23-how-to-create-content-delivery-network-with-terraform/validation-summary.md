# Validation Summary: How to Create Content Delivery Network with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS CloudFront
- Amazon S3
- AWS Certificate Manager
- Amazon Route 53
- CloudFront cache policies and origin request policies

## Sources Consulted
- Terraform Registry: aws_cloudfront_distribution resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform Registry: aws_cloudfront_cache_policy resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- Terraform Registry: aws_cloudfront_create_invalidation action: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/actions/cloudfront_create_invalidation
- AWS CloudFront API Reference: DefaultCacheBehavior and CacheBehavior: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DefaultCacheBehavior.html
- AWS CloudFront Developer Guide: Restrict access to an Amazon S3 origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront Developer Guide: Use managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront Developer Guide: Invalidate files to remove content: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html

## Issues Found
- The first CloudFront example attached the managed `Managed-CachingOptimized` cache policy and also set `min_ttl`, `default_ttl`, and `max_ttl` directly in `default_cache_behavior`. CloudFront now recommends setting TTLs in cache policies rather than using the legacy cache behavior TTL fields, so the direct TTL fields and misleading comment were removed.
- The section titled "Cache Invalidation" said it set up a Lambda function to invalidate the cache, but the snippet only created an `aws_cloudfront_cache_policy`. The heading and introduction were changed to "Custom Cache Policy" and now accurately describe the code.

## Review Notes
- Terraform was not installed in the local workspace, so the snippets were reviewed against official Terraform Registry and AWS documentation rather than validated with `terraform validate`.
- The custom-domain example creates an A alias record. Because the distributions enable IPv6, a future improvement would be to add matching AAAA alias records for IPv6 clients.
