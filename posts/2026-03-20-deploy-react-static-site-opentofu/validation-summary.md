# Validation Summary: How to Deploy a React Static Site with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- React
- OpenTofu
- AWS S3
- Amazon CloudFront
- AWS Certificate Manager (ACM)
- AWS CLI

## Sources Consulted
- OpenTofu CLI `output` command: https://opentofu.org/docs/cli/commands/output/
- AWS Certificate Manager DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- CloudFront Origin Access Control with S3 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- S3 Block Public Access: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- CloudFront managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- CloudFront cache behavior API reference: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CacheBehavior.html
- CloudFront cache policy guidance: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-create-cache-policy.html
- CloudFront cache behavior settings: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
- AWS CLI `s3 sync`: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI `s3 cp`: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI `cloudfront create-invalidation`: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- CloudFront invalidation and file versioning: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html
- CloudFront file versioning guidance: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/UpdatingExistingObjects.html

## Issues Found
- The S3 bucket name used `data.aws_caller_identity.current.account_id`, but the post did not declare that data source. I added `data "aws_caller_identity" "current" {}` so the snippet is internally consistent.
- The ACM section only showed an aliased `us-east-1` provider, while the rest of the resources implicitly rely on a default AWS provider configuration. I added the default `provider "aws"` block for the primary region.
- The ACM section requested a DNS-validated certificate but did not mention that ACM requires DNS validation records before CloudFront can use the certificate. I added a note to create the ACM CNAME records and wait until the certificate is `Issued`.
- The deploy commands used `tofu output -raw` for `s3_bucket_name` and `cloudfront_distribution_id`, but the post did not define those outputs. I added the missing output blocks.
- The original `aws s3 sync build/ ... --cache-control "max-age=31536000"` applied a one-year cache header to every file except `index.html`, including non-hashed root files such as manifests and icons. I changed the commands so only hashed assets under `build/static/` get long-lived cache headers, while non-hashed files use `no-cache`.
- The `ordered_cache_behavior` used legacy `ForwardedValues`-style settings. CloudFront's current guidance is to use cache policies, so I replaced that block with the managed `CachingOptimized` cache policy ID.
- The `PriceClass_100` comment was incomplete. I corrected it to include Israel, which is part of that price class in current AWS documentation.

## Review Notes
- The post now accurately assumes a build layout with `build/` and `build/static/`. That matches common Create React App-style output; other React toolchains may use a different output directory.
- The SPA fallback using CloudFront custom error responses for both `403` and `404` is a common pattern for private S3 origins behind CloudFront. A more advanced setup can rewrite only application routes so missing static assets still return a real `404`, but the current pattern is technically valid.
