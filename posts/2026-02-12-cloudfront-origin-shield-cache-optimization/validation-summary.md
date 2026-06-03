# Validation Summary: How to Configure CloudFront Origin Shield for Cache Hit Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- CloudFront Origin Shield
- AWS CLI
- AWS CloudFormation
- Amazon CloudWatch metrics
- Amazon S3 origins
- CloudFront cache policies and compression

## Sources Consulted
- Amazon CloudFront Developer Guide: Use Amazon CloudFront Origin Shield - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html
- AWS CloudFormation Template Reference: AWS::CloudFront::Distribution OriginShield - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-originshield.html
- AWS CloudFormation Template Reference: AWS::CloudFront::Distribution Origin - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-origin.html
- AWS CloudFormation Template Reference: AWS::CloudFront::OriginAccessControl OriginAccessControlConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-originaccesscontrol-originaccesscontrolconfig.html
- AWS CloudFormation Template Reference: AWS::CloudFront::Distribution S3OriginConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-s3originconfig.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront Developer Guide: Types of metrics for CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- Amazon CloudFront Developer Guide: Understand cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html
- AWS CLI Command Reference: cloudwatch get-metric-data - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-data.html
- AWS Price List API for Amazon CloudFront - https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudFront/current/index.json
- OneUptime linked blog URL, verified HTTP 200 - https://oneuptime.com/blog/post/2026-02-12-cloudfront-continuous-deployment-safe-rollouts/view

## Issues Found
- The post stated that Origin Shield means only one request reaches the origin. AWS describes request collapsing as resulting in as few as one origin request, so the wording was changed to avoid an absolute guarantee.
- The S3 origin examples used legacy CloudFront Origin Access Identity. AWS recommends Origin Access Control for S3 origins, so the API-style snippet and CloudFormation template were updated to use OAC and an S3 bucket policy.
- The CloudWatch example used a non-documented `OriginShieldHitRatio` metric. CloudFront documentation lists `CacheHitRate` and `OriginLatency`, and Origin Shield hits are identified in CloudFront logs as `OriginShieldHit`, so the measurement section was corrected.
- The CloudWatch example queried `OriginLatency` with `Average`. AWS documents `OriginLatency` as percentile-based, so the example now uses `p50`.
- The measurement text referred to an Origin Shield hit ratio threshold. Because CloudFront does not publish that as a CloudWatch metric, the guidance now recommends comparing cache hit rate, origin request counts, latency percentiles, and CloudFront log entries.
- The compression guidance said gzip/Brotli reduced transfer size without splitting the cache. AWS documents that CloudFront normalizes `Accept-Encoding` and includes it in the cache key when compressed-object caching is enabled, so the wording was corrected.
- The Origin Shield price was listed as roughly $0.0035 per 10,000 requests. Current AWS Price List data shows $0.0075 per 10,000 requests in US regions, $0.009 in most Europe and Asia Pacific regions, and $0.016 in South America (Sao Paulo), so the pricing paragraph and ROI example were updated.

## Review Notes
The AWS CLI was not installed in the local workspace, so command syntax was checked against AWS CLI documentation rather than local `aws --help` output. CloudFront additional metrics such as `CacheHitRate` and `OriginLatency` must be enabled per distribution and are retrieved through CloudWatch in `us-east-1`.
