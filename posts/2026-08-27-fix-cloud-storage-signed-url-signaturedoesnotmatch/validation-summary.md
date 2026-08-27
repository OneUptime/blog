# Validation Summary: Fix Cloud Storage Signed URL `SignatureDoesNotMatch` Errors

## Status
validated

## Post Type
Technical troubleshooting guide / Tutorial

## Technologies Covered
- Google Cloud Storage XML API
- Cloud Storage V4 signed URLs and canonical requests
- Google Cloud CLI (`gcloud storage sign-url`)
- Google Cloud IAM service account impersonation and blob signing
- HTTP methods, headers, query strings, redirects, and CORS
- curl file uploads

## Sources Consulted
- Cloud Storage canonical requests — https://cloud.google.com/storage/docs/authentication/canonical-requests
- Cloud Storage signatures — https://cloud.google.com/storage/docs/authentication/signatures
- V4 signing with Cloud Storage tools — https://cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- `gcloud storage sign-url` reference — https://cloud.google.com/sdk/gcloud/reference/storage/sign-url
- Cloud Storage signed URLs — https://cloud.google.com/storage/docs/access-control/signed-urls
- Cloud Storage XML API headers and query parameters — https://cloud.google.com/storage/docs/xml-api/reference-headers
- Cloud Storage XML API status and error codes — https://cloud.google.com/storage/docs/xml-api/reference-status
- Cloud Storage CORS behavior — https://cloud.google.com/storage/docs/cross-origin
- Google Cloud service account authentication roles — https://cloud.google.com/iam/docs/service-account-permissions
- Google Cloud service account impersonation — https://cloud.google.com/docs/authentication/use-service-account-impersonation
- RFC 9110, HTTP Semantics — https://www.rfc-editor.org/rfc/rfc9110.html
- curl command-line reference — https://curl.se/docs/manpage.html
- Local Google Cloud SDK 561.0.0 command help for `gcloud storage sign-url`

## Issues Found

1. **Single-request wording could imply single use or body binding:** The opening said a V4 signed URL authorizes "one precisely constructed HTTP request," and the conclusion used similar wording. Signed URLs can be used more than once while active, and their canonical payload value is `UNSIGNED-PAYLOAD`, so the upload body bytes are not themselves bound by the V4 URL signature. Changed the wording to say that requests must match a canonical request shape.

2. **Preliminary-request wording was ambiguous for browsers:** The post grouped preliminary requests with wrong-method failures, but a browser's CORS `OPTIONS` preflight is a separate, expected request rather than an attempt to use the `PUT`-signed operation as `OPTIONS`. Replaced the ambiguous wording with a concrete `HEAD` probe example and explicitly distinguished CORS preflight.

3. **Impersonated signing prerequisites and authorization timing were incomplete:** The post mentioned `iam.serviceAccounts.signBlob` but omitted the IAM Service Account Credentials API and described the supporting role as narrowly scoped without naming where to scope the grant. Added the API prerequisite, named `roles/iam.serviceAccountTokenCreator`, scoped the grant to the signing service account, and clarified that blob-signing authorization is checked during URL generation while Cloud Storage operation permission is enforced when the signed request is used.

4. **Unexpired was treated as equivalent to active:** The post said anyone with an unexpired URL could use it, but a URL can become inactive before its timestamp-based expiration, such as when its signing key is rotated. Changed the claim to apply while the signed URL remains active.

## Review Notes
- Both `gcloud storage sign-url` examples use current flags and valid dictionary syntax for `--headers`; the two-header form is correctly comma-delimited.
- Both curl examples are valid raw `PUT` uploads. `--request PUT` is redundant because `--upload-file` selects `PUT` for HTTP(S), but it is harmless and makes the signed method explicit.
- `--fail-with-body` is current and non-deprecated; it requires curl 7.76.0 or newer.
- All links in the post resolve to the intended current documentation pages.
