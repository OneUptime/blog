# Validation Summary: How to Stream Large Files from S3 in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS SDK for JavaScript v3
- Amazon S3 GetObject, HeadObject, and Range requests
- Node.js streams and `stream/promises`
- Express HTTP responses
- `zlib` gzip decompression
- `readline` async iteration
- `stream-json`
- `@aws-sdk/lib-storage` streaming uploads

## Sources Consulted
- AWS SDK for JavaScript v3 `GetObjectCommand`: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/GetObject
- Amazon S3 `GetObject` API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- AWS SDK for JavaScript v3 S3 migration notes and `@aws-sdk/lib-storage`: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-s3.html
- AWS SDK for JavaScript v3 `Upload` class: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/Class/Upload
- Node.js Streams documentation: https://nodejs.org/api/stream.html
- Node.js `readline` documentation: https://nodejs.org/api/readline.html
- Express response API: https://expressjs.com/en/api.html#res.headersSent
- `stream-json` package documentation: https://www.npmjs.com/package/stream-json

## Issues Found
- The missing-object handling only checked `NoSuchKey`, but `HeadObject`/S3 SDK errors may also surface as `NotFound` or an HTTP 404. Updated the Express examples to treat those forms as 404 responses.
- The download filename was interpolated directly into `Content-Disposition`, which can break the header if the S3 key contains quotes or line breaks. Added minimal filename sanitization.
- The range request example accepted malformed ranges, did not support suffix ranges like `bytes=-500`, and did not return `416` for unsatisfiable ranges. Replaced the parsing with single-range validation that clamps valid ranges and returns `Content-Range: bytes */size` for invalid requests.
- The range response used `metadata.ContentType` directly, which can be undefined. Added an `application/octet-stream` fallback.
- The gzipped CSV example imported unused stream helpers and used `.pipe()` despite recommending `pipeline`. Updated it to use `stream/promises.pipeline` through the gzip transform and line reader.
- The streaming upload example wrote one million rows without respecting writable-stream backpressure, so it could buffer heavily in memory. Added a `writeLine` helper that waits for the `drain` event when `PassThrough.write()` returns `false`.

## Review Notes
The code examples use current AWS SDK v3 and Node.js stream APIs. The range example intentionally supports one byte range because Amazon S3 does not support retrieving multiple ranges in a single `GET` request.
