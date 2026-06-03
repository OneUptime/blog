# Validation Summary: How to Use CloudFront Origin Failover for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- CloudFront origin groups and origin failover
- Amazon S3 cross-region replication
- Application Load Balancers
- AWS CLI
- Amazon CloudWatch alarms and CloudFront metrics
- CloudFront standard and real-time access logs
- AWS WAFv2

## Sources Consulted
- Amazon CloudFront Developer Guide: Optimize high availability with CloudFront origin failover - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html
- Amazon CloudFront Developer Guide: Request and response behavior for origin groups - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorOriginGroups.html
- Amazon CloudFront Developer Guide: Origin settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- Amazon CloudFront API Reference: OriginGroupFailoverCriteria - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_OriginGroupFailoverCriteria.html
- AWS CLI Command Reference: cloudfront create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudFront Developer Guide: Types of metrics for CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- Amazon CloudFront Developer Guide: Standard logging reference - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html
- AWS CLI Command Reference: wafv2 update-web-acl - https://docs.aws.amazon.com/cli/latest/reference/wafv2/update-web-acl.html

## Issues Found
- CloudFront origin failover was described as retrying any request method. Updated the explanation and limitations to state that CloudFront only fails over for `GET`, `HEAD`, and `OPTIONS` viewer requests.
- The `DefaultCacheBehavior` AWS CLI JSON used simplified arrays for `AllowedMethods` and `CachedMethods`. Updated it to the AWS CLI distribution-config structure, with `CachedMethods` nested under `AllowedMethods`.
- The maintenance-page custom origin snippet omitted fields expected in the CloudFront custom origin configuration. Added `HTTPPort` and `OriginSslProtocols`.
- The failover timing section implied a fixed 15 second maximum. Reworded it to distinguish connection timeout failover from origin read timeout behavior.
- The logging section implied separate primary `Error` and secondary `Miss` access log entries for failover. Reworded it to describe the fields that can be used to investigate failover and residual errors.
- The limitations section said "No automatic failback," which was ambiguous because CloudFront tries the primary origin on each request. Renamed this to "No global failover state."
- The WAFv2 testing command omitted `--rules`, while `update-web-acl` replaces mutable web ACL settings. Added an explicit empty rules list for the disposable test example.

## Review Notes
The examples are still intentionally partial CloudFront distribution fragments rather than complete distribution configs. In a production setup, S3 origins that use Origin Access Control also need a matching bucket policy granting CloudFront access.
