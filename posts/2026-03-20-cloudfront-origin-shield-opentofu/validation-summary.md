# Validation Summary: How to Set Up Origin Shield with OpenTofu on CloudFront

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS CloudFront
- CloudFront Origin Shield
- Amazon CloudWatch
- AWS Certificate Manager (ACM)

## Sources Consulted
- AWS CloudFront Developer Guide: Origin Shield https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html
- AWS CloudFront Developer Guide: View CloudFront and edge function metrics https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html
- AWS CloudFront Developer Guide: Types of metrics for CloudFront https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CloudFront Developer Guide: Standard logging reference https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html
- AWS CloudFront Developer Guide: Origin settings https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- AWS CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- HashiCorp AWS provider source for `aws_cloudfront_distribution` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.30.0/internal/service/cloudfront/distribution.go
- HashiCorp AWS provider source for `aws_cloudfront_monitoring_subscription` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.30.0/internal/service/cloudfront/monitoring_subscription.go
- HashiCorp AWS provider source for `aws_acm_certificate` data source https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/acm/certificate_data_source.go

## Issues Found
- The post described Origin Shield as if edge locations talked to it directly. AWS documents Origin Shield as sitting between regional edge caches and the origin, so the explanatory text and diagram were corrected to reference regional edge caches.
- The provider comment said CloudFront "must" use `us-east-1`. That is not generally true for the distribution resource. The comment was corrected to the specific `us-east-1` requirements used by this example: ACM viewer certificates and CloudFront metrics.
- The Origin Shield region allowlist was outdated. It was updated to include the currently documented supported regions that were missing from the post, including `ap-northeast-2` and `me-central-1`.
- The monitoring example incorrectly alarmed on the `Requests` metric while claiming to measure origin-facing Origin Shield effectiveness. `Requests` is a viewer-request metric. The snippet was replaced with a correct CloudFront monitoring subscription plus a `CacheHitRate` alarm.
- The best-practices section referred to an `OriginShieldHit` metric and included a hard-coded price point. AWS documents `OriginShieldHit` as a CloudFront log result type, not a CloudWatch metric, and Origin Shield pricing depends on current pricing and whether it is acting as an incremental layer. Both statements were corrected.

## Review Notes
- CloudFront additional distribution metrics such as `CacheHitRate` are optional and incur additional CloudWatch charges.
- AWS documents that Origin Shield is not used for gRPC requests; those requests are proxied directly to the gRPC origin even when Origin Shield is enabled.
