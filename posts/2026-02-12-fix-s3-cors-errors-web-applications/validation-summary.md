# Validation Summary: How to Fix S3 CORS Errors in Web Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3
- S3 CORS configuration
- AWS CLI
- Boto3
- JavaScript Fetch API
- CloudFront
- HTTP CORS and preflight requests

## Sources Consulted
- Amazon S3 User Guide: Elements of a CORS configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html
- AWS CLI Command Reference: put-bucket-cors: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html
- AWS CLI Command Reference: get-bucket-cors: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-cors.html
- Amazon S3 User Guide: Uploading objects with presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- Boto3 documentation: Presigned URLs: https://docs.aws.amazon.com/boto3/latest/guide/s3-presigned-urls.html
- Amazon CloudFront Developer Guide: Cache content based on request headers / Configure CloudFront to respect CORS settings: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html
- AWS CLI Command Reference: create-response-headers-policy: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-response-headers-policy.html
- MDN Web Docs: Cross-Origin Resource Sharing (CORS): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs: Preflight request: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request

## Issues Found
- The CloudFront section said to forward the `Origin` header and include `Origin` in the cache key, but AWS documentation specifies that when caching S3 `OPTIONS` preflight responses, CloudFront should also forward `Access-Control-Request-Headers` and `Access-Control-Request-Method`. Updated the text and command comments to include those headers.
- The CloudFront response headers policy example did not mention that creating the policy alone is not enough. AWS documentation says a response headers policy must be attached to one or more cache behaviors before it affects responses, so the comment above the command now says to create the policy and attach it to a cache behavior.

## Review Notes
The S3 CORS JSON fields, allowed S3 methods, AWS CLI `put-bucket-cors` and `get-bucket-cors` usage, Boto3 presigned PUT URL example, JavaScript `fetch` upload example, and `curl` preflight test are technically valid. The sample CORS policies are intentionally broad for troubleshooting; production use should limit origins, methods, and headers to the minimum required.
