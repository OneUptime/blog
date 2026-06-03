# Validation Summary: How to Create CloudFront Distributions with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- TypeScript
- Amazon CloudFront
- Amazon S3 origins and Origin Access Control
- AWS Certificate Manager
- Amazon Route 53
- CloudFront cache and origin request policies
- CloudFront Functions
- AWS WAF

## Sources Consulted
- AWS CDK API Reference: CloudFront origins and `S3BucketOrigin.withOriginAccessControl()` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront_origins-readme.html
- AWS CDK API Reference: `DistributionProps`, including `certificate`, `domainNames`, and `webAclId` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.DistributionProps.html
- AWS CDK API Reference: Route 53 `ARecord` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.ARecord.html
- AWS CDK API Reference: CloudFront `Function` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Function.html
- Amazon CloudFront Developer Guide: Configure alternate domain names and HTTPS - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- Amazon CloudFront Developer Guide: Managed origin request policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- Amazon CloudFront Developer Guide: CloudFront Functions JavaScript runtime restrictions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-10.html
- Amazon CloudFront Developer Guide: CloudFront Functions metrics and compute utilization - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html
- Amazon CloudFront Developer Guide: CloudFront quotas - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html

## Issues Found
- The SPA error-response explanation said S3 returns 404 for deep links. With a private standard S3 origin using OAC, missing objects can return 403 unless CloudFront has `s3:ListBucket` permission. Updated the explanation to mention both 403 and 404, matching the code's two error responses.
- The custom-domain example configured both `www.example.com` and `example.com` as CloudFront alternate domain names but only created a Route 53 alias for `www`. Added an apex alias record so both configured names have DNS records.

## Review Notes
The CDK examples use current v2 constructs, including `S3BucketOrigin.withOriginAccessControl()` instead of the deprecated `S3Origin`. The ACM certificate requirement for CloudFront is correctly called out as `us-east-1`; in a real multi-region CDK app, this usually needs a dedicated certificate stack or an imported certificate ARN.
