# Validation Summary: How to Build a Streaming File Upload API with Express.js and Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Express.js
- Node.js streams
- Busboy
- Google Cloud Storage for Node.js
- Google Cloud Run
- Google Cloud CLI
- curl multipart uploads

## Sources Consulted
- Busboy README/API documentation: https://github.com/mscdex/busboy
- Busboy npm package metadata for current version: https://www.npmjs.com/package/busboy
- Google Cloud Storage Node.js client documentation: https://cloud.google.com/nodejs/docs/reference/storage/latest
- Google Cloud Storage Node.js package metadata for current version: https://www.npmjs.com/package/@google-cloud/storage
- Node.js stream documentation: https://nodejs.org/api/stream.html
- Cloud Run request timeout documentation: https://cloud.google.com/run/docs/configuring/request-timeout
- Cloud Run memory limits documentation: https://cloud.google.com/run/docs/configuring/services/memory-limits
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy

## Issues Found
- The single-file upload handler responded from Busboy's `finish` event based on `uploadResult`, but the Cloud Storage write stream can finish after Busboy has parsed the request. Updated the handler to track Cloud Storage writes with promises and wait for them before responding.
- The single-file size-limit path could send a response before central upload completion handling and could race with stream errors. Updated it to record the upload error, destroy the write stream, attempt cleanup with `ignoreNotFound`, and return a 413 response from one place.
- The multiple-file example did not handle Busboy's per-file `limit` event, so a truncated file could be uploaded and reported as successful. Added limit handling, cleanup, and 413 handling for oversized files.
- The multiple-file example used the client-provided filename directly in the Cloud Storage object name. Busboy documentation warns that filenames should not be used as-is, so the example now generates a safe object name and preserves only the extension.
- The progress-tracking example treated `content-length` as the exact file size, but multipart `content-length` is the full request size. Updated the comment and parsing call to make the progress percentage explicitly approximate.

## Review Notes
- The Cloud Run deployment flags shown are current and valid, but production deployments should also consider authentication, request size, client timeout behavior, IAM for the Cloud Run service account, and whether resumable uploads are preferable for larger files.
