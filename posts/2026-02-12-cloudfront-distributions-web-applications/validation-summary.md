# Validation Summary: How to Create CloudFront Distributions for Web Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- AWS CLI
- Amazon S3 origins
- Application Load Balancer origins
- AWS Certificate Manager
- Route 53 alias records
- CloudFront cache policies and origin request policies
- CloudFront response headers policies
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon CloudFront API Reference: DistributionConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DistributionConfig.html
- Amazon CloudFront API Reference: CacheBehavior - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CacheBehavior.html
- Amazon CloudFront API Reference: DefaultCacheBehavior - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DefaultCacheBehavior.html
- Amazon CloudFront API Reference: AllowedMethods - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_AllowedMethods.html
- Amazon CloudFront API Reference: CachedMethods - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CachedMethods.html
- Amazon CloudFront API Reference: S3OriginConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_S3OriginConfig.html
- Amazon CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Amazon CloudFront Developer Guide: Use managed origin request policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- Amazon CloudFront Developer Guide: Serve compressed files - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
- Amazon CloudFront Developer Guide: Configure alternate domain names and HTTPS - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- Amazon CloudFront Developer Guide: Understand response headers policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-response-headers-policies.html
- Amazon CloudFront Developer Guide: Create response headers policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/creating-response-headers-policies.html
- Amazon CloudFront Developer Guide: Monitor CloudFront metrics with Amazon CloudWatch - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/monitoring-using-cloudwatch.html
- Amazon CloudFront Developer Guide: Types of metrics for CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CLI Command Reference: cloudfront create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found
- The distribution configuration used raw arrays for `AllowedMethods` and `CachedMethods`. CloudFront's API and AWS CLI distribution config expect `AllowedMethods` to be an object with `Quantity`, `Items`, and optional nested `CachedMethods`. Updated the full distribution config and API behavior example accordingly.
- The static cache behavior mixed a managed `CachePolicyId` with explicit legacy TTL fields. The managed `CachingOptimized` policy already defines the TTL values, and AWS recommends TTL configuration in cache policies. Removed the redundant TTL fields from that behavior.
- The compression guidance warned that an origin that also compresses responses would cause double-compressed content. CloudFront checks the origin's `Content-Encoding` header and does not compress already-compressed objects when that header is present. Updated the wording to require the correct header.
- The security headers section created a response headers policy but did not mention attaching it to cache behaviors. Added a sentence explaining that the returned policy ID must be attached with `ResponseHeadersPolicyId`.
- The monitoring section implied all listed metrics are automatic. `CacheHitRate` requires additional CloudFront metrics to be enabled. Updated the wording to distinguish default and additional metrics.
- The CloudWatch CLI example omitted `--region us-east-1`. CloudFront metrics are retrieved from the US East (N. Virginia) Region while using the `Region=Global` metric dimension. Added the region flag.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
