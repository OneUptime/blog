# Validation Summary: How to Set Up CloudFront with Custom Origins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- CloudFront custom origins and VPC origins
- AWS CLI
- AWS WAF
- Amazon VPC security groups and AWS-managed prefix lists
- Amazon CloudWatch metrics
- NGINX origin header validation

## Sources Consulted
- Amazon CloudFront API Reference: DistributionConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DistributionConfig.html
- Amazon CloudFront API Reference: Origin - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_Origin.html
- Amazon CloudFront API Reference: CustomOriginConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CustomOriginConfig.html
- Amazon CloudFront API Reference: AllowedMethods - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_AllowedMethods.html
- Amazon CloudFront API Reference: OriginSslProtocols - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_OriginSslProtocols.html
- Amazon CloudFront Developer Guide: Origin settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- Amazon CloudFront Developer Guide: Add custom headers to origin requests - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html
- Amazon CloudFront Developer Guide: Locations and IP address ranges of CloudFront edge servers - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html
- Amazon CloudFront Developer Guide: Restrict access with VPC origins - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found
- The main CloudFront distribution JSON used `AllowedMethods` and `CachedMethods` as raw arrays. CloudFront's distribution API expects `AllowedMethods` to be an object with `Quantity` and `Items`, with `CachedMethods` nested inside that object. Updated the snippet to the correct API shape.
- The origin timeout ranges were listed as 1-180 seconds. Current CloudFront API documentation lists `OriginReadTimeout` and `OriginKeepaliveTimeout` as 1-120 seconds, with defaults of 30 and 5 seconds respectively. Updated both ranges.
- The post said CloudFront cannot reach private IP addresses directly and that origins must use public DNS. Current CloudFront supports VPC origins for private ALBs, NLBs, and EC2 instances. Updated the wording to distinguish standard custom origins from VPC origins.
- The external-origin example allowed TLSv1.1. Although it is still an accepted API value for `OriginSslProtocols`, the post recommends production HTTPS best practices, so the example was updated to use TLSv1.2 only.
- The CloudWatch CLI example used `--statistics Average,p99`. `get-metric-statistics` accepts only standard statistics such as `Average` in `--statistics`; percentile statistics such as `p99` must use `--extended-statistics`, and the API does not allow both fields in the same request. Updated the command to request `Average`.
- The summary said the domain name must resolve publicly. Updated it to say the domain name must resolve from CloudFront, which covers both standard custom origins and current VPC origin behavior.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI validation was performed against the official AWS CLI command reference. JSON snippets were syntax-checked locally with Node.js after edits.
