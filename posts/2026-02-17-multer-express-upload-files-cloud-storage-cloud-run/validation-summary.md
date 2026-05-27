# Validation Summary: How to Use Multer with Express.js to Upload Files Directly to Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Express.js
- Multer
- Node.js
- Google Cloud Storage
- Cloud Run
- gcloud CLI
- Signed URLs

## Sources Consulted
- Multer README and API documentation: https://github.com/expressjs/multer
- Multer custom storage engine documentation: https://github.com/expressjs/multer/blob/main/StorageEngine.md
- Google Cloud Storage Node.js client library documentation: https://docs.cloud.google.com/nodejs/docs/reference/storage/latest
- Cloud Storage signed URLs documentation: https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- Cloud Storage signed upload URL sample: https://docs.cloud.google.com/storage/docs/samples/storage-generate-upload-signed-url-v4
- Cloud Storage CORS configuration examples: https://docs.cloud.google.com/storage/docs/cors-configurations
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run memory limits documentation: https://docs.cloud.google.com/run/docs/configuring/services/memory-limits
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- multer-cloud-storage npm package documentation: https://www.npmjs.com/package/multer-cloud-storage

## Issues Found
- The setup installed `multer-cloud-storage` and the section claimed to use it, but the code implemented a custom Multer storage engine instead. Updated the dependency list and section text to match the actual implementation.
- The code installed the latest `uuid` package but used CommonJS `require('uuid')`; current `uuid` releases are ESM-oriented and can fail in a CommonJS sample. Replaced it with Node's built-in `crypto.randomUUID()`.
- The upload callback returned `filename` as `uploads/<uuid>.<ext>`, while the signed URL and delete endpoints expected a bare filename and prepended `uploads/` themselves. Updated the storage engine and signed upload endpoint to return the bare filename while preserving the Cloud Storage object path separately.
- The sample used `writeStream.bytesWritten` for file size, which is not part of the documented Cloud Storage write stream API. Updated the storage engine to count bytes from the incoming file stream.
- The sample returned a `publicUrl` for an object that is not necessarily public. Replaced it with a `gs://` URI to avoid implying public access.
- The direct browser upload example omitted the required CORS caveat for cross-origin `PUT` requests to Cloud Storage. Added a concise note to configure bucket CORS for the web origin, `PUT`, and `Content-Type`.

## Review Notes
All JavaScript code blocks were syntax-checked with Node.js after the edits. The Cloud Run deployment command uses current `gcloud run deploy` flags, and `--memory 256Mi`, `--timeout 300`, `--port 8080`, and `--set-env-vars` are valid for Cloud Run services. In a production deployment, signed URL generation on Cloud Run may require ensuring the service account has the permissions needed to sign URLs, depending on the credential path used.
