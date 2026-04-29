# Validation Summary: How to Create Lambda@Edge Functions with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Lambda@Edge
- Amazon CloudFront
- AWS Identity and Access Management (IAM)
- Python

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply
- AWS Lambda@Edge overview: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-the-edge.html
- AWS Lambda@Edge restrictions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-edge-function-restrictions.html
- AWS Lambda@Edge IAM permissions and roles: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-permissions.html
- Amazon CloudFront quotas: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
- CloudFront Lambda function association API reference: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_LambdaFunctionAssociation.html
- CloudFront header forwarding and legacy cache settings: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html
- CloudFront origin header guidance and `Authorization` forwarding: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html
- CloudFront managed origin request policy guidance for `Host`: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS Lambda Python runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- IAM `Principal` element reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html

## Issues Found
- The Lambda timeout comment was incorrect. It said viewer events max out at 5 seconds and origin events at 30 seconds. AWS CloudFront quotas currently document a Lambda@Edge function timeout of up to 30 seconds. I kept the example timeout at 5 seconds, but changed the comment so it no longer states an incorrect limit.
- The CloudFront example forwarded both `Authorization` and `Host` headers to a custom origin. AWS documents that forwarding the viewer `Host` header to custom origins can prevent some origins from working because they often expect the origin domain name. I removed `Host` from the example because it was not needed for the auth-check pattern shown.
- The viewer certificate example did not note that ACM certificates used by CloudFront must be in `us-east-1`. I added a short inline comment to prevent a common invalid configuration.

## Review Notes
- The post now validates technically after the fixes above.
- The `python3.11` runtime is still supported as of April 29, 2026, but it is not the newest Python runtime available in AWS Lambda.
- The `forwarded_values` block is still valid as a legacy cache-settings configuration, but AWS generally recommends cache policies and origin request policies for newer CloudFront configurations.
