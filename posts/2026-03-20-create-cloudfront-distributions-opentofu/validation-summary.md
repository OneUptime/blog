# Validation Summary: How to Create CloudFront Distributions with OpenTofu - Create

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS CloudFront (CDN distributions, Origin Access Control)
- AWS S3 (static site hosting, public access block)
- AWS ALB (Application Load Balancer as origin)
- AWS ACM (Certificate Manager, us-east-1 requirement)
- AWS Route53 (alias DNS records)
- AWS provider for Terraform/OpenTofu (`hashicorp/aws`)

## Sources Consulted
- AWS provider docs — `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS provider docs — `aws_cloudfront_origin_access_control`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- AWS provider docs — `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- AWS provider docs — `aws_cloudfront_cache_policy` (data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudfront_cache_policy
- AWS provider docs — `aws_cloudfront_origin_request_policy` (data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudfront_origin_request_policy
- AWS provider docs — `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS docs — Using managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS docs — Using managed origin request policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- AWS docs — Restricting access to S3 origins with OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS docs — Requirements for using SSL/TLS certificates with CloudFront (must be in us-east-1)

## Issues Found
No technical issues found.

All HCL syntax, resource argument names, and managed policy references are correct:
- `aws_cloudfront_origin_access_control` fields (`origin_access_control_origin_type=s3`, `signing_behavior=always`, `signing_protocol=sigv4`) match the documented allowed values.
- `aws_cloudfront_distribution` includes all required top-level blocks (`enabled`, `default_cache_behavior`, `origin`, `restrictions`, `viewer_certificate`).
- The S3 origin uses `bucket_regional_domain_name` (the correct attribute when pairing with OAC; using `bucket_domain_name` can cause sigv4/region-mismatch issues).
- Managed policy names (`Managed-CachingOptimized`, `Managed-CachingDisabled`, `Managed-AllViewer`) are real AWS-managed policy names and are looked up correctly via the data sources.
- The `viewer_certificate` block uses valid values (`sni-only`, `TLSv1.2_2021`).
- The `aws_route53_record` alias block uses the correct CloudFront output attributes (`domain_name`, `hosted_zone_id`).
- The claim that ACM certificates for CloudFront must reside in `us-east-1` is correct.
- The recommendation to prefer OAC over the legacy OAI for S3 origins is current AWS guidance.

## Review Notes
- The post is illustrative and intentionally omits `var` declarations (`var.domain_name`, `var.bucket_name`, `var.environment`) and supporting resources (`aws_lb.main`, `data.aws_route53_zone.main`). Readers will need to define these themselves; this is acceptable for a focused tutorial.
- DNS validation records for `aws_acm_certificate` are not shown — in production, an `aws_route53_record` for each `domain_validation_options` entry plus `aws_acm_certificate_validation` is typically required before the certificate becomes usable.
- An S3 bucket policy granting CloudFront (with the OAC's source ARN condition) `s3:GetObject` on the bucket is needed for OAC to actually serve objects. The post focuses on the distribution itself and omits this; readers building end-to-end should add it.
- `price_class` is not set, so the distribution defaults to `PriceClass_All`. For cost-sensitive deployments, `PriceClass_100` or `PriceClass_200` may be preferred.
- The ALB example sets `origin_protocol_policy = "https-only"` which requires the ALB listener to accept HTTPS — readers using HTTP-only ALBs would need `http-only` or `match-viewer`.
