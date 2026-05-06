# Validation Summary: How to Configure CloudFront Cache Behaviors with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CloudFront
- AWS provider for OpenTofu/Terraform
- HCL
- CDN caching

## Sources Consulted
- AWS CloudFront Developer Guide, Cache behavior settings: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
- AWS CloudFront Developer Guide, Understand cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html
- AWS CloudFront Developer Guide, Understand how origin request policies and cache policies work together: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-how-origin-request-policies-and-cache-policies-work-together.html
- AWS CloudFront Developer Guide, Understand origin request policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-request-understand-origin-request-policy.html
- AWS CloudFront Developer Guide, Require HTTPS for communication between CloudFront and your custom origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html
- AWS CloudFront Developer Guide, Requirements for using SSL/TLS certificates with CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- OpenTofu CLI docs, `init`: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu CLI docs, `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs, `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- HashiCorp AWS provider docs source, `aws_cloudfront_cache_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_cache_policy.html.markdown
- HashiCorp AWS provider docs source, `aws_cloudfront_origin_request_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_request_policy.html.markdown
- HashiCorp AWS provider docs source, `aws_cloudfront_distribution`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown

## Issues Found
- The image cache behavior used `*.{jpg,jpeg,png,gif,webp,svg,ico}`, but CloudFront path patterns only support `*` and `?`, and the documented character set does not include `{` or `}`. I changed the example to `/images/*` and updated the comment so the behavior uses a valid CloudFront path pattern.
- The API cache policy omitted `enable_accept_encoding_gzip` and `enable_accept_encoding_brotli` even though the attached cache behavior had `compress = true`. AWS documents that cache-policy compression settings are part of enabling CloudFront compression with cache policies, so I added both flags to the API cache policy.
- The origin example used `aws_lb.app.dns_name` together with `origin_protocol_policy = "https-only"`. For HTTPS custom origins, CloudFront requires the origin certificate to match the configured origin domain name. I changed the example to `var.origin_domain_name` so the example can use a hostname whose certificate matches the HTTPS origin.
- The origin request policy comment said it forwarded headers and cookies, but the configuration also forwarded all query strings. I corrected the comment to match the actual behavior.

## Review Notes
- The AWS-managed `CachingOptimized` cache policy ID used in the post (`658327ea-f89d-4fab-a63d-7e88639e58f6`) is current as of 2026-05-06.
- `tofu` was not installed in the local workspace, so the command examples were verified against official OpenTofu documentation instead of local `--help` output.
