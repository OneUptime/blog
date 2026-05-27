# Validation Summary: Use Signed Policy Documents for Browser-Based Uploads to Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Cloud Storage XML API HTML form uploads
- V4 signed POST policy documents
- Python `google-cloud-storage` client library
- Node.js `@google-cloud/storage` client library
- Browser `multipart/form-data` uploads
- Cloud Storage CORS configuration

## Sources Consulted
- Google Cloud Storage: Upload an object with HTML forms: https://docs.cloud.google.com/storage/docs/xml-api/post-object-forms
- Google Cloud Storage: Signatures and policy documents: https://docs.cloud.google.com/storage/docs/authentication/signatures
- Google Cloud Storage Python client `Client.generate_signed_post_policy_v4`: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.client.Client
- Google Cloud Storage Node.js `GenerateSignedPostPolicyV4Options`: https://docs.cloud.google.com/nodejs/docs/reference/storage/latest/storage/generatesignedpostpolicyv4options
- Google Cloud Storage CORS configuration examples: https://docs.cloud.google.com/storage/docs/cors-configurations

## Issues Found
- The opening comparison overstated signed URL requirements by saying the backend must know the content type upfront. Updated it to clarify that signed URLs sign a specific object name and only the request headers you choose to require.
- The Python examples passed `client._credentials`, which relies on a private client attribute. Updated the examples to create explicit service account signing credentials and pass those credentials to `generate_signed_post_policy_v4`.
- The first Python example accepted multiple exact MIME types but generated a policy that allowed any `Content-Type`. Updated the code and argument description so the exact-match helper only accepts one MIME type, with an explicit error for unsupported multi-type input.
- The HTML form example used JavaScript later that referenced `fileInput`, but the file input did not have that ID. Added the matching `id`.
- The "Allow Specific File Types" pattern used an unrestricted `Content-Type` condition, which did not actually restrict the upload. Updated it to show an exact `Content-Type` condition and note that the backend should generate a separate policy for the selected type.

## Review Notes
The overall signed POST policy flow, required form fields, condition types, `content-length-range` usage, Node.js API usage, and CORS JSON shape match current official Google Cloud documentation. The examples still rely on service account credentials capable of signing; workloads using metadata-server credentials may need IAM signing support or explicit signing credentials.
