# Validation Summary: How to Fix CloudFront 'Distribution Not Working' Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon CloudFront
- Amazon Route 53
- AWS Certificate Manager
- Amazon S3 origins and static website endpoints
- AWS WAF
- AWS CLI
- DNS
- TLS/SSL
- CloudFront access logging

## Sources Consulted
- Amazon CloudFront API Reference: Distribution status: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_Distribution.html
- Amazon CloudFront Developer Guide: Distribution settings: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesGeneral.html
- Amazon CloudFront Developer Guide: Alternate domain names (CNAMEs): https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html
- Amazon Route 53 Developer Guide: Alias records and CloudFront targets: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias-common.html
- AWS General Reference: CloudFront hosted zone ID: https://docs.aws.amazon.com/general/latest/gr/cf_region.html
- Amazon CloudFront Developer Guide: Origin settings: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront Developer Guide: CloudFront origin-facing IP ranges and managed prefix lists: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html
- Amazon CloudFront Developer Guide: Cache behavior path matching: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
- Amazon CloudFront Developer Guide: HTTPS between CloudFront and custom origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html
- Amazon CloudFront Developer Guide: Geographic restrictions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/georestrictions.html
- Amazon CloudFront Developer Guide: Standard and real-time access logs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html
- Amazon CloudFront Developer Guide: Real-time log fields and `x-amz-cf-id`: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html
- AWS CLI Command Reference: `cloudfront get-distribution`: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/get-distribution.html
- AWS CLI Command Reference: `route53 change-resource-record-sets`: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI Command Reference: `wafv2 get-web-acl`: https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-web-acl.html
- AWS CLI Command Reference: `wafv2 get-logging-configuration`: https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-logging-configuration.html
- AWS public IP range data: https://ip-ranges.amazonaws.com/ip-ranges.json

## Issues Found
- The DNS check only queried `CNAME`, but the Route 53 example creates an alias `A` record. A Route 53 alias `A` record resolves to CloudFront edge IP addresses and will not appear as a CNAME response. Updated the section to distinguish CNAME records from Route 53 alias A/AAAA records, and changed the Route 53 comment to say alias `A` record.
- The deployment timing used a fixed "5-15 minutes" range. AWS documentation says propagation usually completes within minutes but can take longer. Updated the wording to avoid an overly specific timing claim.
- The S3 origin guidance mixed a regional S3 bucket origin with the global `my-bucket.s3.amazonaws.com` endpoint and labeled the S3 website endpoint as generally problematic. Updated the guidance to recommend the regional bucket endpoint for S3 bucket origins and clarify that S3 website endpoints are valid only as custom origins and support HTTP only.
- The origin firewall example filtered `ip-ranges.json` for `CLOUDFRONT`, but origins should allow CloudFront origin-facing ranges. Updated the filter to `CLOUDFRONT_ORIGIN_FACING` and added the AWS-managed prefix list names for security group use.
- The WAF section said `get-web-acl` checks WAF logs. That command retrieves Web ACL configuration, not logs. Updated the label and added `wafv2 get-logging-configuration` so readers can find the configured logging destination before inspecting blocked requests.

## Review Notes
The remaining AWS CLI examples and CloudFront configuration field names are consistent with current AWS CLI and CloudFront documentation. The local environment did not have the AWS CLI installed, so command syntax was verified against the official AWS CLI command reference rather than local `--help` output.
