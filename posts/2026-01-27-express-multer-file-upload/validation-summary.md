# Validation Summary: How to Build File Upload APIs with Express and Multer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js
- Multer
- Busboy
- file-type
- AWS SDK for JavaScript v3
- Amazon S3
- multer-s3
- Server-Sent Events

## Sources Consulted
- Express Multer middleware documentation: https://expressjs.com/en/resources/middleware/multer/
- Express routing guide: https://expressjs.com/en/guide/routing/
- Busboy README and API documentation: https://github.com/mscdex/busboy
- multer-s3 README: https://github.com/anacronw/multer-s3
- file-type README: https://github.com/sindresorhus/file-type
- AWS SDK for JavaScript v3 S3 request presigner documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html

## Issues Found
- The magic-byte validation example used `require('file-type')` and `fileType.fromBuffer()`. Current `file-type` releases are ESM-only and expose `fileTypeFromBuffer`, so the CommonJS example would fail. Changed it to dynamically import `fileTypeFromBuffer`.
- The magic-byte validation accepted WebP in the Multer filter but rejected it during content validation. Added `image/webp` to the content-validation allow list.
- The document MIME allow list described Word documents but only included legacy `.doc` MIME type. Added the OOXML `.docx` MIME type.
- Some examples used client-supplied filenames directly. Replaced those usages with basename extraction and a conservative filename sanitizer where the filename is incorporated into local paths or generated object keys.
- The presigned download route used `/download/:key`, which does not handle S3 object keys containing slashes such as `uploads/example.pdf`. Changed it to accept the object key as a query parameter.
- The presigned URL snippet used `path.basename()` after sanitization was added but did not import `path`. Added the missing import.
- The progress-tracking example generated the upload ID only inside the upload request, which prevents a client from polling progress while the upload is still in progress. Updated the example to allow the client to provide an `uploadId`, and changed the completion response text from "Upload started" to "Upload complete".
- The Busboy progress example used the parser `finish` event. Current Busboy examples use `close` for completion, so the example was updated to use `close`.

## Review Notes
- The S3 `key` callback reads `req.body.folder`; Multer notes that `req.body` may not be fully populated yet because it depends on multipart field order. The example has a fallback and remains plausible, but production code should avoid relying on later multipart fields being available inside storage callbacks.
- The examples use MIME-type and extension checks as first-pass validation. This is technically valid for filtering, but production systems should still treat uploaded content as untrusted and apply deeper validation or scanning where appropriate.
