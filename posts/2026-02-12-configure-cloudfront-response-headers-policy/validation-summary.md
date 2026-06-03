# Validation Summary: How to Configure CloudFront Response Headers Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFront response headers policies
- AWS CLI for CloudFront
- HTTP security headers
- CORS headers
- Content Security Policy
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: create-response-headers-policy: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-response-headers-policy.html
- Amazon CloudFront Developer Guide: Add or remove HTTP headers in CloudFront responses: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html
- Amazon CloudFront Developer Guide: Understand response headers policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-response-headers-policies.html
- Amazon CloudFront Developer Guide: Use managed response headers policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-response-headers-policies.html
- Amazon CloudFront API Reference: ResponseHeadersPolicyConfig and related types: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_ResponseHeadersPolicyConfig.html
- Terraform AWS Provider: aws_cloudfront_response_headers_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_response_headers_policy

## Issues Found
- Clarified that response headers policies apply to responses for cache behaviors where the policy is attached, not automatically to every response across a distribution.
- Corrected the managed policy name from `CORS-with-preflight` to `CORS-With-Preflight` and clarified that `SimpleCORS` is for simple CORS requests.
- Adjusted the CSP example so `fonts.googleapis.com` is listed under `style-src` and `fonts.gstatic.com` under `font-src`, matching common Google Fonts usage.
- Updated the permissions policy table value so it matches the configuration example.
- Reworked the distribution update command so it extracts `.DistributionConfig` from `get-distribution-config` output before calling `update-distribution`, because `update-distribution` expects the distribution config object rather than the wrapper containing `ETag`.
- Added the CloudFront CORS `OriginOverride` caveat: when `OriginOverride` is false and the origin returns any CORS header, CloudFront keeps the origin's CORS headers instead of adding the policy CORS headers.
- Clarified that removing `Server` removes the origin's value, but CloudFront still adds `Server: CloudFront`.

## Review Notes
The AWS CLI was not installed locally, so CLI syntax was verified against official AWS CLI and CloudFront API documentation rather than local `aws --help` output.
