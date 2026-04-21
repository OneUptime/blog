# Validation Summary: How to Deploy a Static Site on S3 and CloudFront with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-code guide

## Technologies Covered
- OpenTofu
- HCL
- AWS S3
- Amazon CloudFront
- CloudFront Origin Access Control
- AWS Certificate Manager
- Amazon Route 53

## Sources Consulted
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront API Reference: S3OriginConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_S3OriginConfig.html
- Amazon CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Amazon CloudFront Developer Guide: Use managed origin request policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- Amazon CloudFront Developer Guide: Change response codes returned by CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages-response-code.html
- Amazon CloudFront Developer Guide: Add an alternate domain name - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CreatingCNAME.html
- Amazon Route 53 Developer Guide: Routing traffic to an Amazon CloudFront distribution by using your domain name - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html
- Amazon Route 53 Developer Guide: Choosing between alias and non-alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- AWS Certificate Manager User Guide: Validate domain ownership for AWS Certificate Manager public certificates - https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html
- AWS provider documentation: aws_cloudfront_distribution - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS provider documentation: aws_acm_certificate - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate.html.markdown
- AWS provider documentation: aws_acm_certificate_validation - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate_validation.html.markdown

## Issues Found
- The description claimed automatic cache invalidation with OpenTofu, but the post does not define any invalidation workflow. Removed that claim.
- The introduction claimed sub-millisecond TTFB from edge locations, which is not a documented CloudFront guarantee. Changed it to low-latency responses from edge locations.
- The post described Origin Access Identity as deprecated. AWS documentation describes OAI as legacy/not recommended and recommends OAC for S3 origins, so the wording now says legacy instead of deprecated.
- The ACM validation resource referenced `aws_route53_record.cert_validation`, but the Route 53 snippet did not define that record. Added the DNS validation `aws_route53_record` resource using `domain_validation_options`.
- The `PriceClass_100` explanation omitted Israel. Updated the inline comment and best-practice bullet to include US, Canada, Europe, and Israel.
- The managed cache policy best-practice bullet compared cache policies to cache behaviors, which are different CloudFront concepts. Changed the comparison to managed versus custom cache policies.
- The inline `CachingOptimized` comment described the policy as optimized for S3 origins. AWS documents it as optimized for cache efficiency, so the comment now matches the managed policy description.

## Review Notes
The CloudFront OAC bucket policy, managed cache policy ID, managed origin request policy ID, ACM us-east-1 requirement, Route 53 alias record usage, and SPA custom error response pattern were checked against official documentation. I could not run `tofu validate` or `terraform validate` locally because neither binary is installed in the environment.
