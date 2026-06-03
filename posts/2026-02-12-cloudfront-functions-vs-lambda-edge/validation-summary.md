# Validation Summary: How to Use CloudFront Functions vs Lambda@Edge

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon CloudFront
- CloudFront Functions
- Lambda@Edge
- AWS Lambda
- AWS CDK
- AWS CLI
- JavaScript and TypeScript

## Sources Consulted
- AWS CloudFront Developer Guide: Differences between CloudFront Functions and Lambda@Edge: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html
- AWS CloudFront Developer Guide: Quotas: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
- AWS CloudFront Developer Guide: JavaScript runtime features for CloudFront Functions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-features.html
- AWS CloudFront Developer Guide: CloudFront Functions event structure: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- AWS CloudFront Developer Guide: Restrictions on Lambda@Edge: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-edge-function-restrictions.html
- AWS CLI Command Reference: cloudfront test-function: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/cloudfront/test-function.html
- AWS CDK API Reference: aws_cloudfront.FunctionProps: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.FunctionProps.html
- AWS CDK API Reference: aws_cloudfront_origins README: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront_origins-readme.html
- AWS CloudFront pricing page: https://aws.amazon.com/cloudfront/pricing/
- AWS Lambda pricing page: https://aws.amazon.com/lambda/pricing/

## Issues Found
- The Lambda@Edge comparison table had outdated or incorrect quota values for execution time, memory, package size, and request scale. Updated those values to match the current AWS CloudFront edge function documentation.
- The post said CloudFront Functions do not support `async/await` or ES6+ features. Current CloudFront Functions runtimes are ECMAScript 5.1 compliant and support selected newer JavaScript features, especially in runtime 2.0. Reworded this to emphasize the actual constraints: no Node.js runtime, `require`, npm packages, Node.js globals, or network APIs.
- The Lambda@Edge use-case list and decision flowchart framed ES6/async syntax as a deciding factor. Reworded these to focus on needing full Node.js/npm support or unsupported JavaScript features.
- The JWT Lambda@Edge example referenced an undefined `decodeAndVerifyJwt` helper while claiming to verify JWT signatures. Replaced it with an explicit `jsonwebtoken` verification example.
- The CDK example used `origins.S3Origin`, which is deprecated in current AWS CDK documentation. Updated it to `origins.S3BucketOrigin.withOriginAccessControl(bucket)`.
- The CDK example did not specify a CloudFront Function runtime. Added `cloudfront.FunctionRuntime.JS_2_0` to align with the runtime guidance in the article.
- The performance section included overly specific latency multipliers not backed by official AWS documentation. Reworded it to the documented submillisecond CloudFront Functions behavior and Lambda@Edge's longer supported execution duration.

## Review Notes
- The `x-xss-protection` response header is largely obsolete in modern browsers, but keeping it in the example is not a functional correctness issue.
- The JWT example uses a placeholder signing secret for readability. Real deployments should manage key material carefully, and Lambda@Edge's lack of custom environment variables affects how secrets and public keys are supplied.
