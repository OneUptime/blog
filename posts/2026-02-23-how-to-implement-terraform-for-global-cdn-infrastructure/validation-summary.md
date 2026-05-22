# Validation Summary: How to Implement Terraform for Global CDN Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS CloudFront
- AWS WAFv2
- Amazon S3 origin access control
- AWS Certificate Manager
- Amazon CloudWatch
- Amazon SNS

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- HashiCorp Terraform AWS Provider documentation for `aws_cloudfront_cache_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- HashiCorp Terraform AWS Provider documentation for `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- HashiCorp Terraform AWS Provider documentation for `aws_cloudfront_monitoring_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_monitoring_subscription
- AWS CloudFront documentation for CloudWatch metrics: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CloudFront documentation for cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html
- AWS CloudFront documentation for compressed files: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
- AWS CloudFront documentation for alternate domain names and HTTPS certificates: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- AWS CloudFront documentation for S3 origin access control: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS WAF documentation for CloudFront resource scope and Region requirements: https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html

## Issues Found
- The API cache behavior referenced `aws_cloudfront_cache_policy.disabled.id`, but the cache policy section did not define that resource. Added a disabled caching policy with `min_ttl`, `default_ttl`, and `max_ttl` all set to `0`, which CloudFront documents as disabling caching.
- The WAF rate-limit rule used `override_action`, which the Terraform AWS provider documents for rule group statements such as managed rule groups. Changed the rate-based rule to use `action { block {} }`, leaving `override_action { none {} }` on the AWS managed rule group.
- The cache hit rate alarm used the `CacheHitRate` CloudFront metric, which AWS documents as an additional metric that must be enabled for the distribution. Added an `aws_cloudfront_monitoring_subscription` resource with additional metrics enabled.

## Review Notes
- The snippets are illustrative and still assume supporting resources exist, including the S3 bucket, origin access control, origin request policies, CloudFront Function, ACM certificate validation, SNS topic, provider aliases, and S3 bucket policy for OAC.
- CloudFront certificates for alternate domain names must be issued or imported in `us-east-1`; the certificate resource itself is not shown in the post.
