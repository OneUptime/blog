# Validation Summary: How to Use Dapr AWS S3 Output Binding for Object Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings API)
- AWS S3 (object storage)
- Node.js / JavaScript (@dapr/dapr SDK)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr AWS S3 Binding official documentation: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr v1.14 AWS S3 Binding documentation: https://v1-14.docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr JS SDK (`@dapr/dapr`) binding API reference

## Issues Found

### 1. Incorrect use of `encodeBase64` as per-request metadata on `create` operation
**What was wrong:** The "Uploading Binary Files" section passed `encodeBase64: "true"` as per-request metadata on the `create` operation. This is incorrect for two reasons: (a) `encodeBase64` is a component-level metadata field, not a per-request field; (b) `encodeBase64` controls encoding data on **retrieval** (`get`), not on upload (`create`). The correct field for decoding base64 content before saving to S3 is `decodeBase64`, and it must be set at the component level.

**What was changed:**
- Removed `encodeBase64: "true"` from the per-request metadata in the binary upload example.
- Changed the component YAML `decodeBase64` from `"false"` to `"true"` so that base64-encoded data is properly decoded before being stored in S3.
- Updated the text/JSON upload function to base64-encode content before sending (via `Buffer.from(content).toString("base64")`), since `decodeBase64: "true"` at the component level means all `create` data is expected to be base64-encoded.

### 2. `list` operation passes `prefix` in metadata instead of data
**What was wrong:** The `listDocuments` function passed `{ prefix }` as the 4th argument (metadata) to `client.binding.send`. According to official Dapr documentation, the `list` operation expects its parameters (`prefix`, `maxResults`, `marker`, `delimiter`) in the **data** field (3rd argument), not in metadata.

**What was changed:** Moved `prefix` from the metadata argument (4th) to the data argument (3rd) as `JSON.stringify({ prefix })`, and passed an empty object `{}` for metadata.

## Review Notes
- The `contentType` metadata field used on `create` operations is not explicitly listed in the official Dapr S3 binding documentation's create-operation metadata table, but it is functional in the Dapr S3 binding implementation. This is acceptable but undocumented behavior.
- The `Content-Disposition` header passed as create metadata is also not documented in the official Dapr S3 binding docs. It may or may not be passed through to S3 depending on the Dapr version.
- The `encodeBase64` component-level field (set to `"false"`) controls whether `get` operations return base64-encoded content. This is correctly configured for the blog's retrieval examples which parse the response directly as text/JSON.
