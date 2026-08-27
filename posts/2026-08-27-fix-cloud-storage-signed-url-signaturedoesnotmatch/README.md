# Fix Cloud Storage Signed URL `SignatureDoesNotMatch` Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Cloud Storage, Signed URLs, HTTP, Security

Description: Fix Cloud Storage V4 signed URL failures by sending the exact HTTP method and header values included in the canonical signed request.

---

A Cloud Storage V4 signed URL authorizes requests that match a precisely constructed canonical request. The signature covers a canonical request containing the HTTP method, resource path, canonical query string, canonical headers, signed-header names, and a payload marker.

If a client changes a header that was included when the URL was signed, Cloud Storage calculates a different canonical request and returns `SignatureDoesNotMatch`.

## Generate an upload URL with an explicit content type

This command creates a short-lived URL for an HTTP `PUT` whose signed headers include `content-type`:

```bash
BUCKET='example-private-bucket'
OBJECT='uploads/report.bin'
SIGNING_SA='signed-url@example-project.iam.gserviceaccount.com'

gcloud storage sign-url "gs://${BUCKET}/${OBJECT}" \
  --impersonate-service-account="${SIGNING_SA}" \
  --http-verb=PUT \
  --duration=15m \
  --headers=content-type=application/octet-stream
```

The command prints a signed URL. Treat that URL as a bearer credential until it expires. Store it in `SIGNED_URL` without committing it, logging it, or pasting it into a shared shell transcript.

Upload with the same method and content-type value:

```bash
FILE='./report.bin'

curl --fail-with-body \
  --request PUT \
  --header 'Content-Type: application/octet-stream' \
  --upload-file "${FILE}" \
  "${SIGNED_URL}"
```

HTTP header names are case-insensitive and canonicalized to lowercase for signing. Header values are normalized according to the canonical-request rules, but a semantically different value such as `application/pdf` does not match `application/octet-stream`.

## Read `X-Goog-SignedHeaders`

The URL's `X-Goog-SignedHeaders` query parameter lists the lowercase header names covered by the signature. `host` is required. A URL generated with the command above normally also lists `content-type`.

For every name in `X-Goog-SignedHeaders`:

1. Send that header in the actual request.
2. Use the value that was present during signing.
3. Ensure a proxy, browser, SDK, or gateway does not rewrite the value before Cloud Storage receives it.

Do not copy the complete URL into public decoding tools. Its query string contains the signature and expiration information. Inspect it locally if necessary and redact `X-Goog-Signature` and credential details from any diagnostic output.

## Compare the request systematically

When a signed request fails, compare these inputs with the signing operation.

### HTTP method

A URL signed for `PUT` cannot be used for `POST`, `GET`, or `HEAD`. A client that probes the URL with `HEAD` or follows a redirect with a changed method sends a request that does not match the signed operation; a browser's separate CORS `OPTIONS` preflight is not the signed operation. Send the signed operation directly to the generated URL.

### Host, path, and query string

Use the URL exactly as generated. Do not replace the hostname, change virtual-hosted style to path style, decode and re-encode the object name, remove query parameters, or append an application query parameter after signing.

### Content-Type

If `content-type` is signed, explicitly send the exact value. Browser upload code and HTTP libraries can infer a type or add a multipart boundary. A raw `PUT` body is different from a `multipart/form-data` request.

### Cloud Storage extension headers

If signing included a header such as `x-goog-meta-release`, the upload must send the same header and value:

```bash
gcloud storage sign-url "gs://${BUCKET}/${OBJECT}" \
  --impersonate-service-account="${SIGNING_SA}" \
  --http-verb=PUT \
  --duration=15m \
  --headers=content-type=application/octet-stream,x-goog-meta-release=2026-08-27
```

The request must then include both headers:

```bash
curl --fail-with-body \
  --request PUT \
  --header 'Content-Type: application/octet-stream' \
  --header 'x-goog-meta-release: 2026-08-27' \
  --upload-file "${FILE}" \
  "${SIGNED_URL}"
```

Cloud Storage's canonical-request rules require `x-goog-*` headers used by the request to be accounted for, with the documented exception for `x-goog-content-sha256`. Avoid adding metadata or ACL headers after signing.

## Reproduce with a minimal client

If a browser or application fails, retry the exact operation with `curl`. A successful minimal request points to client-side mutation such as an inferred content type, multipart encoding, proxy rewrite, or changed URL encoding.

If the minimal request also fails, generate a new short-lived URL and compare the method, URL, and signed headers from the start. Also check that the signing machine's clock is accurate and that the URL is not expired. These issues can produce authentication failures even when header values look correct.

## Verify signing permissions separately

The service account used to sign must have the Cloud Storage permission needed for the eventual object operation. For the `--impersonate-service-account` command above, the IAM Service Account Credentials API must be enabled, and the caller must be allowed to sign blobs for that service account. Google recommends granting `roles/iam.serviceAccountTokenCreator` on the signing service account; this role contains `iam.serviceAccounts.signBlob`.

The `signBlob` authorization is checked when the URL is generated, while the Cloud Storage operation permission is enforced when the signed request is used. Both checks are separate from a canonical-request mismatch. Do not respond to `SignatureDoesNotMatch` by making the bucket public or broadly granting Storage Admin.

Use short expirations, distribute signed URLs only to intended recipients, and never reuse a URL in test logs. Anyone possessing a signed URL can perform the operation it authorizes while the URL remains active.

## Official Documentation

- [Cloud Storage canonical requests](https://cloud.google.com/storage/docs/authentication/canonical-requests)
- [Create V4 signed URLs with Cloud Storage tools](https://cloud.google.com/storage/docs/access-control/signing-urls-with-helpers)
- [gcloud storage sign-url reference](https://cloud.google.com/sdk/gcloud/reference/storage/sign-url)
- [Cloud Storage signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Cloud Storage XML API headers](https://cloud.google.com/storage/docs/xml-api/reference-headers)

## Conclusion

Fix `SignatureDoesNotMatch` by treating the signed URL as a contract for a canonical request shape. Send the exact HTTP method and URL, and match every header named by `X-Goog-SignedHeaders`, including its value. A minimal `curl` reproduction helps reveal clients and proxies that silently change the signed request.
