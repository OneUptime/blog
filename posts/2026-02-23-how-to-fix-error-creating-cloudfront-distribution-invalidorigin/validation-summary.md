# Validation Summary: How to Fix Error Creating CloudFront Distribution InvalidOrigin

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (AWS provider)
- AWS CloudFront
- AWS S3 (buckets and static website hosting)
- AWS Application Load Balancer (ALB)
- AWS Origin Access Control (OAC) and Origin Access Identity (OAI)
- AWS IAM bucket policies
- AWS CLI

## Sources Consulted
- Terraform AWS Provider docs: `aws_cloudfront_distribution` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution)
- Terraform AWS Provider docs: `aws_cloudfront_origin_access_control` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control)
- Terraform AWS Provider docs: `aws_s3_bucket` attributes including `bucket_regional_domain_name` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket)
- Terraform AWS Provider docs: `aws_s3_bucket_website_configuration` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_website_configuration)
- AWS CloudFront documentation on origin configurations and supported protocols
- AWS S3 documentation on website endpoints (HTTP-only)
- AWS documentation on restricting S3 access using OAC with `AWS:SourceArn` condition
- AWS CLI docs: `aws s3api head-bucket`

## Issues Found
No technical issues found. All code examples, Terraform resource definitions, attribute names, and AWS-specific facts are accurate:

- `bucket_regional_domain_name` is the correct attribute on `aws_s3_bucket` and resolves to the regional S3 endpoint.
- `aws_s3_bucket_website_configuration` exposes a `website_endpoint` attribute and is the modern (provider v4+) replacement for the inline `website` block.
- The claim that S3 static website endpoints only support HTTP (so `origin_protocol_policy = "http-only"`) is correct.
- The `aws_cloudfront_origin_access_control` arguments (`origin_access_control_origin_type`, `signing_behavior`, `signing_protocol`) and accepted values are correct.
- The recommended S3 bucket policy with the `AWS:SourceArn` condition referencing the CloudFront distribution ARN matches AWS's published OAC guidance.
- Internal ALBs (DNS names prefixed `internal-`) cannot be used as CloudFront origins; `internal = false` is required.
- `origin_id` must match `target_origin_id` exactly — accurate.

## Review Notes
- The `forwarded_values` block used in the cache behavior examples is technically deprecated in favor of `cache_policy_id` (and optional `origin_request_policy_id`) in newer AWS provider versions, but it still works and is widely used in legacy/example code. Not changed since it remains functional and clearer for a troubleshooting context, but future readers may want to migrate to managed cache policies.
- The example `forwarded_values { cookies { forward = "none" } }` will emit a deprecation warning in recent AWS provider versions but does not break the distribution.
- `viewer_certificate { cloudfront_default_certificate = true }` is fine for the `*.cloudfront.net` default domain; if readers add an `aliases` block they will need ACM certs in `us-east-1`.
- The post uses `origin_ssl_protocols = ["TLSv1.2"]` which is acceptable, though AWS now recommends `TLSv1.2` as the minimum and allows higher values like `TLSv1.2_2021`. Not an error.
