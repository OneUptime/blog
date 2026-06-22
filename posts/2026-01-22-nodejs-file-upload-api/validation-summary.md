# Validation Summary: How to Create File Upload API in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Multer
- npm
- AWS SDK for JavaScript v3 / Amazon S3
- Google Cloud Storage Node.js client
- Busboy
- Sharp

## Sources Consulted
- Multer official middleware documentation: https://expressjs.com/en/resources/middleware/multer/
- Express static files documentation: https://expressjs.com/en/5x/starter/static-files/
- npm install documentation: https://docs.npmjs.com/cli/v9/commands/npm-install/
- AWS SDK for JavaScript v3 S3 PutObjectCommand documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/
- Google Cloud Storage Node.js File API documentation: https://googleapis.dev/nodejs/storage/latest/File.html
- Google Cloud Storage make public sample: https://docs.cloud.google.com/storage/docs/samples/storage-make-public
- Busboy official README: https://github.com/mscdex/busboy
- Sharp resize API documentation: https://sharp.pixelplumbing.com/api-resize/

## Issues Found
- The Busboy progress tracking example responded when the parser finished, but before explicitly waiting for the destination file write streams to finish. Updated the example to track write promises, wait for them on Busboy's `close` event, and return an upload failure if a file stream or write stream errors.
- The Google Cloud Storage example awaited `blob.makePublic()` inside an async stream `finish` handler, where errors would not be caught by the outer `try/catch`. Wrapped the `finish` handler body in its own `try/catch` so permission or ACL failures return the intended upload error response.
- The multiple validations example used `String.prototype.substr()`, which is a legacy string API. Replaced it with `slice(2, 11)` to preserve the same filename suffix behavior with a current API.

## Review Notes
- The code examples use current APIs for Multer upload modes, Multer limits and file filters, Express static file serving, AWS SDK v3 `PutObjectCommand`, Google Cloud Storage write streams, Busboy file parsing, and Sharp image resizing.
- MIME type checks using `file.mimetype` are useful first-pass validation but should not be treated as strong content verification for untrusted uploads.
- Public cloud storage URLs may require matching bucket/object permissions or signed URLs depending on the production access model.
