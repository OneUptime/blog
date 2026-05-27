# Validation Summary: How to Use the google-cloud/storage npm Package to Generate Signed URLs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Storage
- @google-cloud/storage npm package
- Node.js
- Express.js
- Cloud Storage signed URLs
- Browser Fetch API

## Sources Consulted
- Google Cloud Storage signed URLs overview: https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- Google Cloud Storage V4 signing with client libraries: https://docs.cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- Google Cloud Storage Node.js GetSignedUrlConfig API reference: https://docs.cloud.google.com/nodejs/docs/reference/storage/latest/storage/getsignedurlconfig
- Google Cloud Storage XML API headers reference: https://docs.cloud.google.com/storage/docs/xml-api/reference-headers

## Issues Found
- The post title and description referred to `google-cloud/storage`, but the actual npm package is `@google-cloud/storage`. Updated the heading and description to use the correct package name.
- The setup and basic client comment implied Application Default Credentials were sufficient without qualification. Google Cloud documentation notes that signing URLs requires credentials capable of signing, such as a service account private key or `iam.serviceAccounts.signBlob` permission. Added that requirement.
- The Express upload endpoint signed `x-goog-content-length-range` as an extension header, but the browser upload example did not send that header. Since signed headers must be included in requests that use a signed URL, updated the API response to return the required upload headers and updated the client upload request to send them.
- The upload-size limit used the client-provided `maxSizeBytes` directly. Added a server-side maximum and rejection for files larger than the configured limit so the example actually enforces a cap.

## Review Notes
The remaining examples use current `@google-cloud/storage` signed URL options, including `version`, `action`, `expires`, `contentType`, `extensionHeaders`, `responseDisposition`, and `responseType`. Browser uploads to Cloud Storage with custom headers may also require bucket CORS settings that allow those headers; that is outside the scope of the existing post but worth covering in a future expansion.
