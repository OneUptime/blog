# Validation Summary: How to Set Up Signed URLs for Secure Content Delivery with Google Cloud CDN

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud CDN
- Cloud CDN signed URLs
- Google Cloud CLI
- HMAC-SHA1 signing
- RFC 4648 base64url encoding
- Python
- Node.js
- Go
- Cloud Storage backend buckets

## Sources Consulted
- Google Cloud CDN documentation: Use signed URLs - https://docs.cloud.google.com/cdn/docs/using-signed-urls
- Google Cloud CLI reference: gcloud compute sign-url - https://docs.cloud.google.com/sdk/gcloud/reference/compute/sign-url
- Google Cloud CLI reference: gcloud compute backend-services add-signed-url-key - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-signed-url-key
- Google Cloud CLI reference: gcloud compute backend-buckets add-signed-url-key - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/add-signed-url-key
- Google Cloud CLI reference: gcloud compute backend-services update - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Compute Engine REST reference: backendServices.addSignedUrlKey - https://docs.cloud.google.com/compute/docs/reference/rest/v1/backendServices/addSignedUrlKey

## Issues Found
- The post incorrectly stated that every request without a valid signed URL is rejected by Cloud CDN. Updated the explanation to reflect that Cloud CDN validates signed requests and rejects invalid signed URL parameters, but unsigned requests must be rejected by the origin or blocked by private Cloud Storage permissions.
- The key generation command produced standard base64 instead of RFC 4648 section 5 base64url encoding. Updated the command to translate `+` to `-` and `/` to `_`.
- Step 3 described `--signed-url-cache-max-age` as enabling a signed URL requirement. Updated it to describe the flag as setting the maximum cache lifetime for responses to signed requests.
- The Python, Node.js, and Go signing examples stripped existing query strings before signing. Updated them to preserve existing query strings and append `Expires`, `KeyName`, and `Signature` with the correct separator.
- The Python example used a naive UTC timestamp pattern. Updated it to use timezone-aware UTC handling.
- The Node.js example decoded the key as standard base64. Updated it to normalize base64url input before decoding.
- The backend service key add/delete examples included `--global`, which is not listed for the `add-signed-url-key` or `delete-signed-url-key` command forms in the Google Cloud CLI reference. Removed `--global` from those examples.
- The test section said a valid signed URL always returns `200 OK`. Updated it to say a valid signed URL returns the same response code sent by the backend.
- The conclusion implied Cloud CDN alone fully protects content. Updated it to include the required origin or Cloud Storage access control requirement.

## Review Notes
- The Python and Node.js snippets were syntax-checked locally. Go tooling was not installed in the review environment, so the Go snippet was reviewed against Google's official Go sample and standard library APIs.
- The local environment did not have `gcloud` installed, so CLI validation used current official Google Cloud CLI reference documentation instead of local `gcloud --help`.
