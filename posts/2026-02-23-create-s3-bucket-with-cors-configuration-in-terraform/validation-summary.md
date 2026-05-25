# Validation Summary: How to Create S3 Bucket with CORS Configuration in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon S3
- Amazon CloudFront
- AWS CLI
- CORS / HTTP
- JavaScript Fetch API

## Sources Consulted
- Terraform AWS Provider documentation for `aws_s3_bucket_cors_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_cors_configuration
- Terraform AWS Provider documentation for `aws_cloudfront_cache_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- Amazon S3 User Guide, Elements of a CORS configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html
- Amazon S3 User Guide, Troubleshooting CORS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors-troubleshooting.html
- Amazon CloudFront Developer Guide, Cache content based on request headers: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html
- AWS CLI Command Reference, `aws s3api get-bucket-cors`: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-cors.html
- MDN Web Docs, Preflight request: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request
- MDN Web Docs, Cross-Origin Resource Sharing (CORS): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

## Issues Found
- The post said browsers first send a preflight OPTIONS request for a cross-origin request. Updated this to clarify that browsers preflight only requests that qualify for preflight, such as non-simple methods or headers.
- The post said S3 evaluates multiple CORS rules in order and uses the first match. Updated this to the documented requirement that S3 needs a rule matching the request origin, method, and requested headers, and advised keeping overlapping rules consistent instead of relying on ordering.
- The troubleshooting list said some S3 CORS configurations forget to include `OPTIONS` in `allowed_methods`. S3 bucket CORS `AllowedMethods` only supports `GET`, `PUT`, `POST`, `DELETE`, and `HEAD`; updated the advice to include the actual requested method from `Access-Control-Request-Method`, such as `PUT`.

## Review Notes
Terraform was not installed in the local environment, so the examples were reviewed against the current official Terraform AWS Provider documentation and HCL syntax by inspection rather than by running `terraform validate`. The CloudFront example is technically plausible but intentionally partial because it references an origin access control resource and distribution settings outside the snippet.
