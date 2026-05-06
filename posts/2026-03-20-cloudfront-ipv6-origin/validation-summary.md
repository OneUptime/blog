# Validation Summary: How to Configure AWS CloudFront with IPv6 Origin Connectivity

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon CloudFront
- AWS CLI
- Terraform AWS Provider
- Amazon Route 53
- Nginx
- IPv6

## Sources Consulted
- AWS CloudFront Developer Guide: Enable IPv6 for CloudFront distributions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-enable-ipv6.html
- AWS CloudFront API Reference: `CustomOriginConfig` - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CustomOriginConfig.html
- AWS CloudFront Developer Guide: Add CloudFront request headers - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-cloudfront-headers.html
- AWS CloudFront Developer Guide: Request and response behavior for custom origins - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html
- AWS CloudFront Developer Guide: Locations and IP address ranges of CloudFront edge servers - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html
- AWS CLI Command Reference: `get-distribution-config` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/get-distribution-config.html
- AWS CLI Command Reference: `update-distribution` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/update-distribution.html
- Amazon Route 53 Developer Guide: Values specific for simple alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html
- HashiCorp AWS Provider docs: `aws_cloudfront_distribution` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS IP ranges JSON - https://ip-ranges.amazonaws.com/ip-ranges.json

## Issues Found
- The description and introduction implied that origin-facing IPv6 applies to all origin types. I corrected this to match AWS documentation: origin-facing IPv6 is for custom origins, excluding Amazon S3 and VPC origins.
- The AWS CLI snippet used the wrong JSON field name, `IsIPv6Enabled`. I corrected it to `IsIPV6Enabled`, which is the field name used by the CloudFront API and AWS CLI.
- The Terraform custom-origin example was incomplete for IPv6 origin connectivity because it did not set `custom_origin_config.ip_address_type`. I added `ip_address_type = "ipv6"` and updated the hostname comment to match IPv6-only origin resolution requirements.
- The Terraform example declared `is_ipv6_enabled` twice in the same resource, which is invalid HCL. I removed the duplicate attribute.
- The custom-origin example forwarded the `Host` header even though that adds extra HTTPS certificate matching requirements that were not explained and can break the example. I removed that header forwarding from the snippet.
- The real-client-IP section implied that `CloudFront-Viewer-Address` is always forwarded. I corrected the explanation to note that this header must be included through an origin request policy.
- The Nginx example trusted an incorrect IPv6 CIDR for CloudFront. I replaced it with the current CloudFront origin-facing IPv6 ranges published by AWS as of 2026-05-06.
- The closing sentence said enabling viewer IPv6 takes effect immediately. I corrected this to reflect CloudFront deployment propagation.

## Review Notes
- Terraform provider docs mark `forwarded_values` as deprecated in favor of `cache_policy_id` and `origin_request_policy_id`. The post's examples remain valid, but newer CloudFront Terraform configurations typically use policies instead.
- CloudFront origin-facing IP ranges can change over time. Re-check AWS `ip-ranges.json` or AWS-managed prefix lists when re-validating this post in the future.
