# Validation Summary: How to Build Streaming File Uploads in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js streams, HTTP requests, and crypto hashing
- Express route handlers
- Busboy multipart parsing
- AWS SDK for JavaScript v3 S3 multipart upload with `@aws-sdk/lib-storage`
- Server-Sent Events and browser upload progress APIs
- Multer custom storage engines

## Sources Consulted
- Busboy official README: https://github.com/mscdex/busboy
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js Stream documentation: https://nodejs.org/api/stream.html
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- AWS SDK for JavaScript v3 `@aws-sdk/lib-storage` README: https://github.com/aws/aws-sdk-js-v3/blob/main/lib/lib-storage/README.md
- AWS S3 multipart upload command documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/CompleteMultipartUploadCommand/
- Express multer middleware documentation: https://expressjs.com/en/resources/middleware/multer/
- Multer custom storage engine documentation: https://github.com/expressjs/multer/blob/main/StorageEngine.md
- MDN Server-Sent Events documentation: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- MDN ProgressEvent `lengthComputable` documentation: https://developer.mozilla.org/en-US/docs/Web/API/ProgressEvent/lengthComputable

## Issues Found
- Several Busboy examples used the parser `finish` event and responded before downstream write streams were guaranteed to finish. Updated examples to use Busboy `close` and, where files are written to disk, track pending writable streams before sending success responses.
- The basic Busboy example marked upload completion on the file stream `end` event rather than the disk write stream `finish` event. Changed it to wait for the writable stream and handle write errors.
- Progress calculations divided by `Content-Length` without checking whether the header was present and valid. Added guards so progress is only calculated when the total length is known.
- The validation example could send multiple responses after validation or write errors. Added `hasError` and `res.headersSent` checks, plus file limit and write error handling.
- The reusable upload middleware called `next()` when Busboy parsing finished, which could happen before file writes finished. Added pending write tracking before calling `next()`.
- The multer custom storage example piped the scanner as a side stream instead of inserting it into the write path. Changed `onStream` to return the processed stream and wired errors through the storage callback.
- The complete working example used `setImmediate()` as a proxy for stream completion. Replaced it with explicit pending write tracking and fixed progress tracking to count file bytes directly.
- The performance table included an unsupported general claim of `~900+` concurrent uploads on 1GB RAM. Replaced it with a constraint-based statement about file descriptors, network, and storage throughput.

## Review Notes
The examples remain intentionally tutorial-sized. For production, readers should also sanitize generated filenames more aggressively, ensure upload directories exist in every snippet that writes to disk, tune Node HTTP `requestTimeout` and reverse proxy limits for long uploads, and consider `stream.pipeline()` for centralized stream cleanup in larger implementations.
