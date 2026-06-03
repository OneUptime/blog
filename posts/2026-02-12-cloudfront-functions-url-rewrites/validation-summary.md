# Validation Summary: How to Use CloudFront Functions for URL Rewrites

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFront
- CloudFront Functions
- Lambda@Edge
- AWS CLI
- JavaScript runtime 2.0 for CloudFront Functions
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon CloudFront Developer Guide: CloudFront Functions event structure - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- Amazon CloudFront Developer Guide: Restrictions on CloudFront Functions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-function-restrictions.html
- Amazon CloudFront Developer Guide: Quotas on CloudFront Functions and Lambda@Edge - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
- Amazon CloudFront Developer Guide: JavaScript runtime 2.0 features for CloudFront Functions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html
- Amazon CloudFront API Reference: FunctionAssociation - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_FunctionAssociation.html
- AWS CLI Command Reference: create-function - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-function.html
- AWS CLI Command Reference: test-function - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/test-function.html
- AWS CLI Command Reference: publish-function - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/publish-function.html
- AWS CLI Command Reference: update-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/update-distribution.html
- Amazon CloudFront Developer Guide: CloudFront metrics - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CloudFront pricing - https://aws.amazon.com/cloudfront/pricing/

## Issues Found
- The post described CloudFront Functions as having a fixed 1ms execution time limit and a separate 10ms viewer response limit. AWS documents CloudFront Function runtime duration through compute utilization, not as a separate viewer response timeout. Updated the wording to describe the short execution limit as compute utilization.
- The sample test event omitted `querystring` and `cookies`. AWS documents these as request object fields, with `querystring` present as an empty object when there is no query string. Added empty `querystring` and `cookies` objects.
- The debugging section said CloudFront Functions do not have `console.log`. AWS documents `console.log()` as a supported helper object method, with restrictions such as no comma syntax. Updated the text to say `console.log()` is supported and test runs return logs.
- The CloudWatch metric examples omitted the required `Region=Global` dimension and the `us-east-1` CloudWatch region used for CloudFront metrics. Added both to the metric commands.
- The limitations section incorrectly listed a "2MB maximum request/response size for manipulation" and repeated the fixed execution-time wording. AWS documents a 2MB maximum function memory quota and says CloudFront Functions do not have access to the HTTP request body. Updated those bullets.

## Review Notes
The JavaScript examples use APIs supported by the CloudFront Functions JavaScript runtime 2.0, including `String.prototype.endsWith()`, `String.prototype.includes()`, `String.prototype.startsWith()`, `Object.keys()`, and `Object.entries()`. The AWS CLI command names and required options match the current AWS CLI reference. The local environment did not have the AWS CLI installed, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
