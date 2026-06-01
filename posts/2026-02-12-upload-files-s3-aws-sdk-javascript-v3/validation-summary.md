# Validation Summary: How to Upload Files to S3 with AWS SDK for JavaScript v3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS SDK for JavaScript v3
- Amazon S3
- Node.js
- JavaScript ES modules
- `@aws-sdk/client-s3`
- `@aws-sdk/lib-storage`
- `@aws-sdk/s3-request-presigner`
- `mime-types`

## Sources Consulted
- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- AWS SDK for JavaScript v3 `PutObjectCommand` API reference: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/PutObject
- AWS SDK for JavaScript v3 `PutObjectRequest` API reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/Interface/PutObjectRequest/
- AWS SDK for JavaScript v3 `@aws-sdk/lib-storage` API reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/
- Amazon S3 object upload documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html
- Amazon S3 multipart upload limits: https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
- AWS Developer Tools Blog on presigned URLs with AWS SDK for JavaScript v3: https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/
- OneUptime linked SDK overview: https://oneuptime.com/blog/post/2026-02-12-aws-sdk-javascript-v3-nodejs/view
- OneUptime linked Boto3 S3 upload guide: https://oneuptime.com/blog/post/2026-02-12-upload-files-s3-boto3/view

## Issues Found
- The streaming upload example said `ContentLength` is "required for streams." The AWS SDK v3 `PutObjectRequest` type marks `ContentLength` as optional and describes it as useful when the body size cannot be determined automatically. I changed the comment to say it is useful when the stream size is not inferred.
- The directory upload snippet imported `extname` from `path` but did not use it. I removed the unused import so the example is cleaner and avoids lint failures in stricter JavaScript projects.

## Review Notes
The AWS SDK v3 APIs used in the examples are current and non-deprecated. `PutObjectCommand`, `Upload` from `@aws-sdk/lib-storage`, and `getSignedUrl` from `@aws-sdk/s3-request-presigner` match AWS documentation. The recommendation to consider multipart uploads around 100 MB and the single-operation PUT limit of 5 GB match Amazon S3 documentation. The presigned URL example is technically correct, but browser uploads still require matching signed headers, such as `Content-Type`, when those headers are included in the presigned command.
