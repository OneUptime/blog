# Validation Summary: How to Use the AWS SDK for JavaScript (v3) with S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS SDK for JavaScript v3
- Amazon S3
- Node.js
- JavaScript ES modules
- S3 multipart uploads
- S3 presigned URLs
- AWS SDK middleware

## Sources Consulted
- AWS SDK for JavaScript v3 Developer Guide: Amazon S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- AWS SDK for JavaScript v3 Developer Guide: Set credentials in Node.js: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html
- AWS SDK for JavaScript v3 API Reference: @aws-sdk/lib-storage Upload: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/
- AWS SDK for JavaScript v3 API Reference: @aws-sdk/lib-storage Configuration: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/Interface/Configuration/
- AWS Developer Tools Blog: Generate a presigned URL in modular AWS SDK for JavaScript: https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/
- AWS SDK for JavaScript v3 Developer Guide: Logging AWS SDK for JavaScript calls: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/logging-sdk-calls.html
- AWS Developer Tools Blog: Introducing Middleware Stack in Modular AWS SDK for JavaScript: https://aws.amazon.com/blogs/developer/middleware-stack-modular-aws-sdk-js/
- AWS SDK for JavaScript v2 API Reference end-of-support notice: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/

## Issues Found
- Multipart upload progress assumed `progress.total` was always present. The AWS SDK progress event can omit `total`, especially for stream bodies of unknown size, so the example could log `NaN%`. Updated the code to guard `progress.total` and fall back to logging uploaded bytes.
- The presigned PUT URL example signed a `ContentType` but did not mention that the upload request must send the same `Content-Type` header. Added a note so readers avoid `SignatureDoesNotMatch` failures.
- The error-handling section said v3 throws specific error classes but only checked `error.name`, and imported `S3ServiceException` without using it. Updated the example to import and use `NoSuchKey`, `NoSuchBucket`, and `S3ServiceException` with `instanceof`.
- The middleware example used `args.constructor.name`, which logs the middleware argument object's constructor rather than the SDK command name. Updated it to use the official middleware `context.commandName` pattern and moved the middleware to the `build` step, matching AWS logging guidance.

## Review Notes
The remaining examples use current AWS SDK for JavaScript v3 package names and command APIs. AWS SDK for JavaScript v2 has reached end-of-support as of September 8, 2025, so the migration recommendation is current for this 2026 post.
