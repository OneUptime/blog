# Validation Summary: How to Create Lambda@Edge Functions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda@Edge
- AWS CloudFront
- AWS IAM
- AWS S3 (referenced as origin)
- Terraform (HCL, `aws` provider, `archive_file` data source)
- Node.js runtime for Lambda
- HTTP security headers (HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

## Sources Consulted
- AWS Lambda@Edge documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-the-edge.html
- AWS Lambda@Edge event types: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-cloudfront-trigger-events.html
- AWS Lambda@Edge restrictions and quotas: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html
- AWS Lambda@Edge response/request event structure: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
- Terraform AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider `aws_iam_role` and trust policy patterns
- AWS Lambda runtime deprecation policy: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- RFC 6797 (HSTS): https://datatracker.ietf.org/doc/html/rfc6797

## Issues Found
- **HSTS directive capitalization**: The `Strict-Transport-Security` header value used `includeSubdomains`. While the directive is case-insensitive per RFC 6797, the standard/conventional spelling is `includeSubDomains` (capital D). Updated to the conventional form.
- **Outdated Node.js runtime**: The post specified `runtime = "nodejs18.x"` for both Lambda@Edge functions. Node.js 18.x reached end-of-support in AWS Lambda in 2025 and is deprecated by the post's validation date (2026-05-24). Updated to `nodejs20.x`, which is currently supported by Lambda@Edge.

## Review Notes
- All four CloudFront event types (viewer-request, viewer-response, origin-request, origin-response) are correctly described.
- The us-east-1 region requirement for Lambda@Edge functions is correct, and the use of an aliased Terraform provider is the recommended pattern.
- The IAM trust policy correctly includes both `lambda.amazonaws.com` and `edgelambda.amazonaws.com` service principals, which is required for Lambda@Edge.
- The handler signature (`event.Records[0].cf.response`) and the header array structure (`[{key, value}]`) are correct for the CloudFront Lambda@Edge response event schema.
- `publish = true` is correctly required because Lambda@Edge cannot use `$LATEST` and must reference a specific published version via `qualified_arn`.
- The runtime constraints listed (5s timeout / 128 MB memory for viewer events; 30s timeout / up to 10,240 MB memory for origin events) match the current AWS quotas.
- The limitation about delayed deletion due to CloudFront replication is accurate; AWS recommends deleting the Lambda@Edge function only after the CloudFront distribution has been updated and replicas have been removed.
- Future caveat: Lambda@Edge runtime support typically lags behind regular Lambda. When Node.js 20.x is deprecated, readers should consult the AWS Lambda@Edge runtime support list before upgrading further (e.g., to nodejs22.x).
