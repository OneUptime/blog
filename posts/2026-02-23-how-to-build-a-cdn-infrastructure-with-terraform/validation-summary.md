# Validation Summary: How to Build a CDN Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS CloudFront
- AWS S3 origins and Origin Access Control
- AWS Application Load Balancer origins
- CloudFront cache policies
- CloudFront origin request policies
- CloudFront response headers policies
- AWS WAFv2
- CloudFront origin failover

## Sources Consulted
- Terraform AWS provider documentation: `aws_cloudfront_distribution` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider documentation: `aws_cloudfront_cache_policy` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- Terraform AWS provider documentation: `aws_cloudfront_origin_request_policy` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_request_policy
- Terraform AWS provider documentation: `aws_cloudfront_response_headers_policy` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_response_headers_policy
- Terraform AWS provider documentation: `aws_wafv2_web_acl` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS CloudFront Developer Guide: response headers policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/creating-response-headers-policies.html
- AWS CloudFront Developer Guide: cache behavior settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
- AWS WAF Developer Guide: resources that AWS WAF can protect - https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html
- AWS WAF Developer Guide: rate-based rule statements - https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html

## Issues Found
- The WAF rate limiting rule used `override_action { none {} }`. Terraform documents `override_action` for rules that reference rule groups, such as managed rule groups. A rate-based statement should use a rule `action`; changed it to `action { block {} }` so requests over the threshold are blocked.
- The post said security headers were added to all responses, but the response headers policy was only attached to the default cache behavior. Added `response_headers_policy_id` to the API and media ordered cache behaviors as well.
- The origin failover example used API-style origin names but only allowed `GET` and `HEAD` and referenced the static assets cache policy. Updated the behavior to allow all API methods, use the API no-cache policy, and forward the API origin request policy.

## Review Notes
The snippets are partial examples and still assume surrounding resources and variables exist, including S3 buckets, an origin access control, provider aliases, ACM certificate, and input variables. CloudFront distributions using ACM certificates for aliases require a certificate in `us-east-1`, which is not shown in the snippet.
