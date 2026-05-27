# Validation Summary: How to Set Up Signed Cookies for Authentication with Google Cloud CDN

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud CDN
- Cloud CDN signed cookies
- Cloud CDN signed URLs / signed request keys
- Google Cloud CLI (`gcloud`)
- Python
- Node.js / Express
- Go
- HTTP cookies

## Sources Consulted
- Google Cloud CDN documentation: Use signed cookies: https://docs.cloud.google.com/cdn/docs/using-signed-cookies
- Google Cloud SDK reference: `gcloud compute backend-services add-signed-url-key`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-signed-url-key
- Google Cloud SDK reference: `gcloud compute backend-buckets add-signed-url-key`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/add-signed-url-key
- Google Cloud Compute Engine REST reference: `backendBuckets.addSignedUrlKey`: https://docs.cloud.google.com/compute/docs/reference/rest/v1/backendBuckets/addSignedUrlKey
- MDN Web Docs: SameSite cookies / Set-Cookie guidance: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie

## Issues Found
- The signing-key generation command produced standard base64, but Google Cloud requires an RFC 4648 Section 5 base64url-encoded 128-bit key. Updated the command to replace `+` with `-` and `/` with `_`.
- The post implied that `--signed-url-cache-max-age` enables signed cookies. Adding a signed request key enables signed URL/cookie support; the flag only controls the maximum cache time for signed requests. Updated the section title and explanation.
- The post stated that invalid cookies get 403 without distinguishing unsigned requests. Cloud CDN rejects invalid signed requests, but it does not block unsigned requests by itself, and origins must validate/reject protected unsigned requests. Added that caveat and updated the testing guidance.
- The Python snippet used `datetime.utcnow()` and a naive epoch. Updated it to use timezone-aware UTC datetimes and removed an unused import.
- The Express cookie comment and security best practice described `SameSite=None` as required for "cross-origin" cookies. Updated the language to "cross-site" cookie use.
- The cross-domain redirect flow said "the CDN domain sets the cookie," which could imply Cloud CDN itself sets application cookies. Clarified that an application endpoint on the CDN/content domain sets the cookie.
- The wrap-up said all subsequent requests under the prefix are automatically validated at the edge. Updated it to say subsequent signed requests are validated, and noted origin-side rejection of unsigned protected requests.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI syntax was verified against official Google Cloud CLI documentation rather than local `--help` output.
- The Python and Node.js snippets were executed locally with sample keys to verify syntax and basic cookie generation behavior.
