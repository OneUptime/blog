# Validation Summary: How to Set Up CloudFront with Multiple Origins and Origin Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront distributions
- CloudFront origins and cache behaviors
- CloudFront origin groups and origin failover
- Amazon S3 and S3 cross-region replication
- Application Load Balancers as CloudFront origins
- AWS CLI
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon CloudFront API Reference: CustomOriginConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CustomOriginConfig.html
- Amazon CloudFront API Reference: Origin - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_Origin.html
- Amazon CloudFront API Reference: CacheBehavior - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CacheBehavior.html
- Amazon CloudFront API Reference: OriginGroup and OriginGroupFailoverCriteria - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_OriginGroup.html and https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_OriginGroupFailoverCriteria.html
- Amazon CloudFront Developer Guide: Request and response behavior for origin groups - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorOriginGroups.html
- Amazon CloudFront Developer Guide: Optimize high availability with CloudFront origin failover - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html
- Amazon CloudFront Developer Guide: Cache behavior settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
- Amazon CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Amazon CloudFront Developer Guide: Use managed origin request policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- Amazon CloudFront Developer Guide: Origin settings and S3 website endpoint behavior - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- Amazon CloudFront Developer Guide: CloudWatch metrics for CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CLI Command Reference: s3api put-bucket-replication - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS CLI Command Reference: cloudfront create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html

## Issues Found
- The ALB origin example used an `internal-...elb.amazonaws.com` style domain with `CustomOriginConfig`. Internal ALBs require CloudFront VPC origins, while the example was showing a regular custom origin. Changed the example domain to an internet-facing-style ALB name.
- The complete custom origin failover example omitted `HTTPPort`, which is required for `CustomOriginConfig` even when the origin protocol policy is `https-only`. Added `HTTPPort`: `80` to both ALB origins.
- The origin failover explanation did not mention that CloudFront origin failover applies only to `GET`, `HEAD`, and `OPTIONS` viewer requests. Added that caveat, including the requirement to cache `OPTIONS` for `OPTIONS` failover.
- The S3 replication command did not show enabling versioning, which S3 replication requires on source and destination buckets. Added `put-bucket-versioning` commands for both buckets.
- The S3 replication rule used an empty `Filter` object. Replaced it with `{"Prefix": ""}`, matching AWS CLI examples for a rule that applies to all objects.
- The S3 failover example text said to include 5xx errors but the status code list only included `403` and `404`. Updated the status code list to include `500`, `502`, `503`, and `504`.
- The monitoring section described the CloudWatch command as origin-specific, but CloudFront standard CloudWatch metrics are distribution-scoped. Updated the wording, added `--region us-east-1`, and clarified that origin-specific health requires logs, origin service metrics, Route 53 health checks, or external monitoring.
- The S3 default origin was labeled as an S3 website origin while the configuration uses an S3 REST bucket endpoint with `S3OriginConfig` and OAC. Changed the diagram label to "S3 Site Origin" to avoid implying an S3 website endpoint.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI verification was performed against the official AWS CLI command reference instead of local `--help` output. All JSON snippets in the post were checked with `jq` after editing and parsed successfully.
