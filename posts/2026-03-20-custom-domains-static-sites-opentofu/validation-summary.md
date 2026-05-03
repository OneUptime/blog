# Validation Summary: How to Configure Custom Domains for Static Sites with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS provider: Route 53, CloudFront, ACM, S3 (`aws_route53_record`, `aws_cloudfront_distribution`, `aws_acm_certificate`, `aws_s3_bucket_website_configuration`)
- Cloudflare provider v5 (DNS records, zone data source, CNAME flattening)
- DNS concepts: A/AAAA/CNAME records, apex/ALIAS/ANAME, TLS certificate validation
- CDN custom domain binding & www → apex redirects

## Sources Consulted
- Terraform AWS provider docs (registry.terraform.io/providers/hashicorp/aws), v6.43.0 — `aws_route53_record`, `aws_acm_certificate`, `aws_acm_certificate_validation`, `aws_cloudfront_distribution`, `aws_s3_bucket_website_configuration`
- Terraform Cloudflare provider docs (registry.terraform.io/providers/cloudflare/cloudflare), v5.19.1 — `cloudflare_dns_record`, `cloudflare_zone` data source
- AWS CloudFront managed cache policies documentation (CachingDisabled ID `4135ea2d-6df8-44a3-9df3-4b5a84be39ad`)
- AWS docs on the canonical CloudFront hosted zone ID (`Z2FDTNDATAQYW2`) used by Route 53 alias records

## Issues Found
1. **Cloudflare resource name out of date.** The post used `cloudflare_record` with the `value` attribute. Cloudflare Terraform provider v5.0.0 (released 2025-01-29) removed `cloudflare_record` in favor of `cloudflare_dns_record`, and renamed the `value` argument to `content`. Updated both apex and www record blocks to use the v5 resource name and attribute.
2. **`cloudflare_zone` data source schema change.** The post passed `name = var.domain_name` at the top level, which is no longer valid in v5 — `name` is a read-only attribute and lookups by domain must use a `filter { name = ... }` block. Updated the data source to use `filter` and switched the downstream zone reference from `.id` to the explicit `.zone_id` exported attribute, matching v5 idioms.

## Review Notes
- All AWS-provider snippets verified against current registry docs: `aws_route53_record` alias syntax, the `for_each` over `domain_validation_options` pattern, the `aws_s3_bucket_website_configuration` `redirect_all_requests_to` block + `website_endpoint` attribute, the CloudFront `viewer_certificate` block with `minimum_protocol_version = "TLSv1.2_2021"`, and the CachingDisabled managed-policy ID are all current and correct.
- `ttl = 1` on the Cloudflare records is intentionally the "automatic" sentinel and is required when `proxied = true`. If a reader sets `proxied = false`, they will need a TTL ≥ 60 (≥ 30 for Enterprise zones) under provider v5.
- The `cdn_hostname` example comment mentions `pages.dev`. Cloudflare Pages custom-domain attachment is normally done through the Pages product UI/API rather than a plain DNS CNAME — readers binding a Cloudflare Pages site should still register the custom domain on the Pages project for TLS issuance to work.
- The `www_redirect` CloudFront distribution depends on `aws_acm_certificate_validation.main.certificate_arn`, which must point to a certificate that includes the `www.${var.domain_name}` SAN. This is implicit in the post but worth flagging for readers.
