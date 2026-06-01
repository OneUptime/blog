# Validation Summary: Build a File Upload Service with Azure Blob Storage SAS Tokens in Express.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Blob Storage
- Shared Access Signature (SAS) tokens
- Express.js
- Node.js
- Browser Fetch API
- XMLHttpRequest upload progress
- CORS

## Sources Consulted
- Microsoft Learn: Create a service SAS for a blob with JavaScript - https://learn.microsoft.com/en-us/azure/storage/blobs/sas-service-create-javascript
- Microsoft Learn: Azure Blob Storage JavaScript client library - https://learn.microsoft.com/en-us/javascript/api/overview/azure/storage-blob-readme
- Microsoft Learn: Put Blob REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob
- Microsoft Learn: Cross-Origin Resource Sharing (CORS) support for Azure Storage - https://learn.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services
- Node.js API documentation: crypto.randomUUID - https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- Express documentation: Error handling - https://expressjs.com/en/guide/error-handling.html
- MDN Web Docs: Forbidden request header - https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header
- npm package metadata for uuid, confirming current package type is module-only - https://www.npmjs.com/package/uuid

## Issues Found
- The setup installed `uuid` and the server used `require('uuid')`. The current `uuid` package is module-only, so that CommonJS import fails with a default `npm install`. Replaced it with Node's built-in `crypto.randomUUID()` and removed the unused `uuid` and `multer` dependencies from the install command.
- The browser Fetch example set `Content-Length`. Browsers treat `Content-Length` as a forbidden request header, so client code cannot set it manually. Removed that header and let the browser set it.
- The confirmation endpoint claimed the service should validate uploaded size and content type but did not enforce either check. Added checks against the blob properties returned by Azure Blob Storage and delete the blob plus metadata when the upload does not match the requested metadata.
- The SAS generation snippet included a misleading `contentType: undefined` line under a comment suggesting the SAS could restrict upload content type. Removed it because SAS content-type fields are not a browser upload content-type enforcement mechanism in this example.
- The browser upload flow omitted the requirement to configure Azure Blob Storage CORS for direct browser uploads from another origin. Added a short note before the browser code.

## Review Notes
The post now uses current APIs and the code snippets parse successfully. In a production implementation, the in-memory metadata map should be replaced with durable storage and the API should authenticate users before issuing SAS URLs.
