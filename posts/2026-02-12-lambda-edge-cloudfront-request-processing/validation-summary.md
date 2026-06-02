# Validation Summary: How to Use Lambda@Edge for CloudFront Request Processing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda@Edge
- Amazon CloudFront
- CloudFront Functions
- AWS CDK v2
- AWS Lambda Node.js runtime
- Amazon S3 origins
- AWS CLI / CloudWatch Logs

## Sources Consulted
- AWS CloudFront Developer Guide: Restrictions on Lambda@Edge - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-edge-function-restrictions.html
- AWS CloudFront Developer Guide: CloudFront events that can trigger a Lambda@Edge function - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-cloudfront-trigger-events.html
- AWS CloudFront Developer Guide: Quotas on Lambda@Edge - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-lambda-at-edge
- AWS CloudFront Developer Guide: Lambda@Edge example functions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html
- AWS CloudFront Developer Guide: Differences between CloudFront Functions and Lambda@Edge - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html
- AWS CloudFront Developer Guide: Edge function logs - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-logs.html
- AWS CDK API Reference: EdgeFunction - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction.html
- AWS CDK API Reference: EdgeLambda - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.EdgeLambda.html
- AWS CDK API Reference: CloudFront Origins - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront_origins-readme.html

## Issues Found
- Corrected Lambda@Edge event descriptions so viewer request and viewer response triggers account for documented exceptions such as automatic HTTP-to-HTTPS redirects, custom error pages, generated viewer-request responses, and origin 4xx/5xx responses.
- Updated stale Lambda@Edge limits: viewer trigger timeout is now documented as up to 30 seconds, and Lambda@Edge function package size is 50 MB compressed. Also clarified that custom environment variables are unsupported.
- Fixed the AWS CDK snippet to use the current `edgeLambdas` shape with `functionVersion` and `eventType` instead of the CloudFront Functions `functionAssociation` shape.
- Replaced deprecated `origins.S3Origin` with `origins.S3BucketOrigin.withOriginAccessControl`.
- Fixed the URL rewriting example so directory paths like `/docs/` do not become `/index.htmlindex.html`, and so API version rewrites run before SPA fallback rewrites.
- Fixed the authentication example so `/` does not accidentally match every route, and added the missing `verifyJwt` implementation needed for the sample to work as described.
- Changed A/B testing from an origin request example to a viewer request example so cookie/random assignment affects the request before CloudFront cache lookup.
- Changed geo-based routing from viewer request to origin request and explained that CloudFront-added geo headers are only available to origin-facing Lambda@Edge triggers after CloudFront is configured to add them.
- Corrected the debugging section to describe logs as appearing in the AWS Region where the Lambda@Edge function is invoked, and adjusted the CLI wording accordingly.
- Updated the CloudFront Functions comparison to acknowledge that CloudFront Functions can handle lightweight authorization checks, while Lambda@Edge is better for authentication that needs libraries or network calls.

## Review Notes
The article is technically valid after the fixes. Future improvements could mention response headers policies as an alternative to a viewer response Lambda@Edge function for static security headers, but that is an optimization rather than a correctness issue.
