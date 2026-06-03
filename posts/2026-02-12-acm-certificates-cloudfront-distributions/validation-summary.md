# Validation Summary: How to Set Up ACM Certificates for CloudFront Distributions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- Amazon CloudFront
- Amazon Route 53
- AWS CLI
- Terraform AWS provider
- TLS/SSL certificates and security policies

## Sources Consulted
- AWS CloudFront Developer Guide: Configure alternate domain names and HTTPS - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- AWS CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CLI Command Reference: cloudfront create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- AWS CLI Command Reference: cloudfront get-distribution-config - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/get-distribution-config.html
- AWS CloudFront API Reference: UpdateDistribution - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_UpdateDistribution.html
- AWS CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront Developer Guide: Supported protocols and ciphers between viewers and CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html
- AWS Certificate Manager User Guide: DNS validation - https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS General Reference: Amazon CloudFront endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/cf_region.html
- Terraform Registry: aws_cloudfront_distribution - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform Registry: aws_acm_certificate_validation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation

## Issues Found
- The AWS CLI `create-distribution` example placed `CachedMethods` as a sibling of `AllowedMethods`. In the AWS CLI distribution config shape, `CachedMethods` belongs inside `AllowedMethods`. Moved it under `AllowedMethods`.
- The CloudFront examples used legacy `ForwardedValues` / Terraform `forwarded_values` cache settings. Replaced them with the current managed cache policy ID for `Managed-CachingOptimized` (`658327ea-f89d-4fab-a63d-7e88639e58f6`).
- The CloudFront `ViewerCertificate` example omitted `CloudFrontDefaultCertificate: false` while using aliases and an ACM certificate. Added it to match the documented custom certificate configuration.
- The list of available CloudFront security policies was missing newer `TLSv1.2_2025` and `TLSv1.3_2025` values. Added both with compatibility notes.
- The certificate update CLI workflow saved the full `get-distribution-config` response as `dist-config.json`, but `update-distribution --distribution-config` expects the `DistributionConfig` object and the ETag separately. Updated the commands to query `DistributionConfig` into the file and capture `ETag` for `--if-match`.

## Review Notes
- The ACM us-east-1 requirement, DNS validation flow, SNI recommendation, CloudFront Route 53 hosted zone ID, and Route 53 alias examples were verified as correct.
- The Terraform distribution snippet assumes surrounding resources such as `data.aws_route53_zone.main`, `aws_s3_bucket.static`, and `aws_cloudfront_origin_access_identity.main` are defined elsewhere.
- For new private S3 origins, CloudFront Origin Access Control is generally the newer pattern than Origin Access Identity, but the OAI configuration shown is still a supported Terraform pattern.
