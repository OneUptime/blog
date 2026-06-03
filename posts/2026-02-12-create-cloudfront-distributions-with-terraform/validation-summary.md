# Validation Summary: How to Create CloudFront Distributions with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS CloudFront
- Amazon S3
- AWS Certificate Manager
- Amazon Route 53
- AWS CLI
- Terraform
- Terraform AWS Provider

## Sources Consulted
- AWS CloudFront Developer Guide: managed cache policies, including `CachingOptimized` and `CachingDisabled`: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront Developer Guide: managed origin request policies, including `CORS-S3Origin` and `AllViewerExceptHostHeader`: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- AWS CloudFront Developer Guide: SSL/TLS certificate requirements for alternate domain names: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront Developer Guide: origin settings and custom origin protocol behavior: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- AWS CloudFront Developer Guide: VPC origins for private ALB/NLB/EC2 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html
- AWS CloudFront Developer Guide: invalidation requests and wildcard path syntax: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation_Requests.html
- AWS CloudFront Developer Guide: invalidation pricing behavior: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html
- Amazon S3 API Reference: `GetObject` missing-object 403 vs 404 behavior depending on `s3:ListBucket`: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- AWS Certificate Manager User Guide: DNS validation requirements: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- Terraform Registry: `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform Registry: `aws_cloudfront_origin_access_control`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- Terraform Registry: `aws_acm_certificate_validation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation

## Issues Found
- The `CORS-S3Origin` managed origin request policy ID was incorrect. Updated it from `88a5eaf4-2f7a-4f8b-9c46-8c48c0a17bf1` to the official AWS ID, `88a5eaf4-2fd4-4709-b370-b4c650ea3fcf`.
- The SPA error-response explanation said S3 returns only 404 for a missing route. With a private S3 bucket and no `s3:ListBucket` permission, S3 can return 403 for a missing object, so the wording now says 403 or 404.
- The SPA explanation said the custom error responses redirect to `index.html`. CloudFront custom error responses return the configured response page and status code; the wording now says they return `index.html` with a 200 response.
- The custom domain example requested an ACM certificate but did not create DNS validation records or wait for validation before attaching the certificate to CloudFront. Added Route 53 validation records and an `aws_acm_certificate_validation` resource, then referenced the validated certificate ARN.
- The API origin examples used `api.internal.example.com` with `custom_origin_config`, which implies a private origin but does not configure CloudFront VPC origins. Updated the examples to use `api.example.com` and clarified the ALB should be internet-facing for the shown configuration.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or provider-level validation. The snippets were reviewed against the official Terraform AWS Provider documentation and AWS service documentation instead. The CloudFront invalidation command and wildcard path quoting are consistent with AWS CLI documentation.
