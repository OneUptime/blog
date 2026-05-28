# Validation Summary: How to Generate and Use Signed URLs for Google Cloud Storage Objects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud CLI
- Cloud Storage signed URLs
- Python `google-cloud-storage`
- Node.js `@google-cloud/storage`
- Express
- Browser `fetch`
- VPC Service Controls
- Signed policy documents

## Sources Consulted
- Google Cloud Storage signed URLs overview: https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- Google Cloud Storage V4 signing with tools: https://docs.cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- `gcloud storage sign-url` reference: https://cloud.google.com/sdk/gcloud/reference/storage/sign-url
- Google Cloud Storage V2 signing process: https://cloud.google.com/storage/docs/access-control/signed-urls-v2
- Python Cloud Storage `Blob.generate_signed_url` API reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- Node.js Cloud Storage `GetSignedUrlConfig` API reference: https://cloud.google.com/nodejs/docs/reference/storage/latest/storage/getsignedurlconfig
- Google Cloud Storage access control overview: https://cloud.google.com/storage/docs/access-control/
- VPC Service Controls ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules

## Issues Found
- The post described signed URLs as regular Cloud Storage URLs. Updated this to Cloud Storage XML API URLs because Google documents that signed URLs only work through XML API endpoints.
- The sequence diagram said the server generates signed URLs with a service account key. Updated this to service account credentials because current Google Cloud tooling can sign with a key file, activated service account credentials, or service account impersonation with `iam.serviceAccounts.signBlob`.
- The `gcloud storage sign-url` credential note incorrectly focused on access to a service account key. Updated it to include authentication as a service account, service account impersonation, and explicit key-file signing.
- The Express backend example used `req.body` without JSON body parsing. Added `app.use(express.json());` so the sample works as written.
- The V2 vs V4 section claimed V2 signed URLs have a maximum expiration of about 10 years and suggested using V2 for URLs longer than 7 days. Updated this to match Google guidance: V2 is legacy and Google recommends expirations of at most 1 week for security and V4 compatibility.
- The Content-Type best practice implied that signing a content type prevents uploading script contents. Updated it to clarify that the signature enforces the `Content-Type` header, not the actual file contents.

## Review Notes
The Python and Node.js signed URL examples use current documented APIs and option names. The samples assume credentials capable of signing URLs; in production, this commonly means a service account key, an attached/impersonated service account with signing permissions, or equivalent signing-capable credentials.
