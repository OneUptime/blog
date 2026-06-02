# Validation Summary: How to Point a Domain to CloudFront with Route 53

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- Amazon Route 53
- AWS Certificate Manager
- AWS CLI
- DNS alias records, A records, AAAA records, and CNAME records
- CloudFront Functions
- TLS/SSL certificates

## Sources Consulted
- Amazon CloudFront Developer Guide: Configure alternate domain names and HTTPS - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- Amazon CloudFront API Reference: UpdateDistribution - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_UpdateDistribution.html
- AWS CLI Command Reference: cloudfront update-distribution - https://docs.aws.amazon.com/goto/aws-cli/cloudfront-2020-05-31/UpdateDistribution
- Amazon Route 53 Developer Guide: Routing traffic to an Amazon CloudFront distribution by using your domain name - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html
- Amazon Route 53 Developer Guide: Choosing between alias and non-alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Amazon Route 53 API Reference: AliasTarget - https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- AWS General Reference: Amazon CloudFront endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/cf_region.html
- AWS Certificate Manager User Guide: DNS validation - https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- Amazon CloudFront Developer Guide: CloudFront Functions event structure - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- Amazon CloudFront Developer Guide: Redirect to a new URL in a CloudFront Functions viewer request event - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_redirect_based_on_country_section.html

## Issues Found
- The prerequisites said the guide would create a CloudFront distribution, but the post only covers wiring an existing distribution to Route 53 and ACM. Changed the prerequisite to require an existing CloudFront distribution.
- Example ACM certificate ARNs used a 9-digit account ID. AWS account IDs in ARNs are 12 digits, so the examples were updated to use `123456789012`.
- The CloudFront update instructions implied that the raw `get-distribution-config` response could be edited and passed directly to `update-distribution`. Official CloudFront documentation requires using the returned ETag as `IfMatch`, removing the top-level `ETag` from the submitted distribution config, and sending the full updated `DistributionConfig` because updates replace the existing config rather than merging. Clarified those requirements and added `CloudFrontDefaultCertificate: false` to the viewer certificate example.

## Review Notes
The Route 53 alias record examples, CloudFront fixed hosted zone ID `Z2FDTNDATAQYW2`, ACM certificate region requirement for CloudFront (`us-east-1`), `EvaluateTargetHealth: false` for CloudFront aliases, and CloudFront Function response shape are consistent with current AWS documentation. The redirect function is intentionally minimal and does not preserve query strings; that may be worth expanding in a future article, but it is not incorrect for a simple host redirect example.
