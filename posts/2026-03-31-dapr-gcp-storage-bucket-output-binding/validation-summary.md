# Validation Summary: How to Use Dapr GCP Storage Bucket Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Google Cloud Storage (GCS)
- Dapr GCP Storage Bucket output binding (`bindings.gcp.bucket`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- gsutil CLI

## Sources Consulted
- Dapr GCP Bucket binding documentation: https://docs.dapr.io/reference/components-reference/supported-bindings/gcpbucket/
- Dapr bindings API specification: https://docs.dapr.io/reference/api/bindings_api/
- Dapr components-contrib source code (GCP bucket binding): https://github.com/dapr/components-contrib/tree/master/bindings/gcp/bucket
- Dapr JavaScript SDK source code: https://github.com/dapr/js-sdk
- Google Cloud Storage gsutil documentation: https://cloud.google.com/storage/docs/gsutil
- Google Cloud Storage IAM documentation: https://cloud.google.com/storage/docs/access-control/iam

## Issues Found

### 1. Metadata field `name` should be `key` (create, get, delete operations)
**What was wrong:** All code examples used `name` as the metadata field for the object key (e.g., `{ name: reportName }`). The canonical and documented metadata field for the GCP bucket binding is `key`.
**What was changed:** Replaced `name` with `key` in the metadata object for all `create`, `get`, and `delete` operation examples.
**Why:** While `name` has backward compatibility mapping for the `get` operation, `key` is the documented primary field across all operations and is more reliable.

### 2. `list` operation passed `prefix` in metadata instead of data payload
**What was wrong:** The `list` example passed `prefix` as the 4th argument (metadata): `client.binding.send("document-store", "list", null, { prefix })`. The GCP bucket component reads `prefix`, `maxResults`, and `delimiter` from the request body (`req.Data`), not from metadata.
**What was changed:** Moved `{ prefix }` from the metadata argument (4th) to the data argument (3rd): `client.binding.send("document-store", "list", { prefix }, {})`.
**Why:** The component source code uses `json.Unmarshal(req.Data, &payload)` to extract list parameters, so they must be in the data payload.

### 3. Custom metadata (`x-goog-meta-*`) section was incorrect
**What was wrong:** The "Setting Object Metadata" section showed passing `x-goog-meta-*` fields through the Dapr binding metadata, implying they would be set as custom metadata on GCS objects. The GCP bucket binding component does NOT support setting custom GCS object metadata — only `key` and `contentType` are handled.
**What was changed:** Renamed the section to "Setting Content Type", removed the `x-goog-meta-*` fields from the example, changed `name` to `key`, and added a note explaining that custom GCS object metadata is not supported through the Dapr binding API.
**Why:** The component's `create` function only sets `ContentType` on the object writer; it does not propagate arbitrary metadata fields to GCS object metadata.

### 4. `gsutil iam ch` command used invalid prefix-scoped URL
**What was wrong:** The command `gsutil iam ch allUsers:objectViewer gs://my-dapr-documents/public` attempted to set IAM on a path within a bucket. GCS IAM policies are set at the bucket level only — `gsutil iam ch` does not support object or prefix paths.
**What was changed:** Fixed the URL to `gs://my-dapr-documents` (bucket level) and added a note clarifying that IAM applies to the entire bucket and recommending a separate bucket for public assets if prefix-level access control is needed.
**Why:** `gsutil iam ch` only operates on bucket URLs; passing a path within a bucket would cause an error.

## Review Notes
- The component type `bindings.gcp.bucket` and version `v1` are correct.
- The component YAML metadata fields (bucket, type, project_id, private_key_id, private_key, client_email, client_id, auth_uri, token_uri, decodeBase64) are all valid.
- The post only covers 4 of 9 supported operations (create, get, delete, list). Additional operations available include: sign, bulkGet, copy, move, and rename. These could be covered in a future update.
- The `decodeBase64` and `encodeBase64` metadata fields are available both at the component level and per-request. The post only mentions the component-level setting.
- The `list` operation also supports `maxResults` (defaults to 1000) and `delimiter` parameters in the data payload, which are not mentioned in the post.
- The lifecycle JSON format used with `gsutil lifecycle set` is correct.
