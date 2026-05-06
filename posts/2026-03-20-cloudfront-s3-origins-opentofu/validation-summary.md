# Validation Summary: How to Create CloudFront Distributions with S3 Origins in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS CloudFront
- Amazon S3
- HCL
- AWS provider for Terraform/OpenTofu

## Sources Consulted
- OpenTofu CLI docs, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs, `tofu apply`: https://opentofu.org/docs/cli/commands/apply/
- AWS provider docs, `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS provider docs, `aws_cloudfront_cache_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- AWS CloudFront Developer Guide, restricting access to an S3 origin with OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon S3 API Reference, `GetObject`: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- AWS CDK CloudFront `PriceClass` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.PriceClass.html

## Issues Found
- The post used the legacy `forwarded_values` block in `default_cache_behavior`. The current AWS provider marks `forwarded_values` as deprecated in favor of cache and origin request policies. I replaced it with an `aws_cloudfront_cache_policy` resource and attached it with `cache_policy_id`, preserving the original TTL, query string, cookie, and compression behavior.
- The `viewer_certificate` block always set `minimum_protocol_version`, but the AWS provider documentation says that field can only be set when `cloudfront_default_certificate = false`. I changed it to set `TLSv1.2_2021` only when a custom domain is in use.
- The SPA routing example only handled `404` responses. With the post's private S3 origin and bucket policy that grants `s3:GetObject` but not `s3:ListBucket`, the S3 `GetObject` docs state that missing objects return `403 Access Denied`, not `404 Not Found`. I added a matching `403` custom error response so SPA routes work with this configuration.
- The comment for `PriceClass_100` was outdated. Current AWS documentation maps it to USA, Canada, Europe, and Israel, so I corrected the comment.

## Review Notes
- The post correctly uses a regular S3 bucket origin with Origin Access Control. If a reader switches to an S3 website endpoint instead, AWS requires configuring that origin as a custom origin and OAC cannot be used.
- When `custom_domain` is set, the ACM certificate referenced by `acm_certificate_arn` must be in `us-east-1` for CloudFront.
