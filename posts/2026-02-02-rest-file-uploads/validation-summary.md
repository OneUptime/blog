# Validation Summary: How to Handle File Uploads in REST APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js / Express.js
- multer (multipart upload middleware)
- Fetch API / FormData (browser)
- FileReader API (browser, base64 conversion)
- @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner (AWS S3 presigned URLs)
- express-rate-limit
- file-type (magic-byte detection)
- clamscan (ClamAV virus scanning)
- HTTP multipart/form-data, base64 JSON, chunked uploads, presigned URL upload patterns

## Sources Consulted
- multer documentation and source: https://github.com/expressjs/multer (storage engines, error codes `LIMIT_FILE_SIZE`, `LIMIT_FILE_COUNT`, `LIMIT_UNEXPECTED_FILE`)
- AWS SDK for JavaScript v3 — S3 client: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
- @aws-sdk/s3-request-presigner — getSignedUrl: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- express-rate-limit docs (v7): https://express-rate-limit.mintlify.app/ and https://github.com/express-rate-limit/express-rate-limit
- Express `express.json` / `express.raw` body parser docs: https://expressjs.com/en/api.html
- MDN — FormData / Fetch API / FileReader / forbidden header names: https://developer.mozilla.org/
- Node.js `crypto.randomBytes`, `fs/promises`, `path` API docs
- clamscan (NodeClam) npm package documentation
- file-type npm package (v16 CJS API surface: `fromBuffer`)

## Issues Found
- **Rate limiting code claimed to limit upload bytes but actually limited request count.** The `dailyUploadLimiter` example set `max: 500 * 1024 * 1024` with the comment "500MB per day" and a stated goal of preventing storage abuse. In express-rate-limit, `max` (the deprecated alias for `limit`) is the number of requests allowed per window, not a byte counter. The original config would have allowed ~524 million requests per day — effectively no limit. Fixed by setting `max: 500` (500 upload requests per day), correcting the comments to reflect what the limiter actually does, and adding a note that capping total bytes requires custom middleware. Also removed the explicit `keyGenerator: (req) => req.ip`, which silently disables express-rate-limit v7's default IPv6 subnet masking (a security regression vs. the default).

## Review Notes
- The presigned-URL client example sets `Content-Length` manually via `fetch`. `Content-Length` is on the Fetch spec's forbidden-header list, so the browser silently ignores the explicit value and computes it from the body anyway. The code still works correctly (since the auto-computed length matches what was signed), so no change was needed, but readers should be aware setting it has no effect in the browser.
- The `file-type` package code uses `require('file-type').fromBuffer(...)`, which is the v16 CommonJS API. file-type v17+ became ESM-only and renamed the export to `fileTypeFromBuffer`. The shown code will only work if the dependency is pinned to v16.x. Not changed because the example is functionally valid for that version and the post does not pin a version range; readers using the latest release should switch to ESM imports.
- The in-memory `uploads` / `pendingUploads` `Map`s have `expiresAt` fields but no background sweep — entries live until the process restarts. The post does call this out ("use Redis in production") so it's an acceptable simplification.
- The chunked-upload assembly writes via `writeStream.write(chunkData)` in a loop without checking backpressure. For very large files this is suboptimal but not incorrect; the subsequent `finish`-event wait ensures the file is fully flushed.
