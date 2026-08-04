# What S3 Compatibility Does Not Guarantee

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Object Storage, Amazon S3, Cloud Storage, Azure Blob Storage, Cloud Portability, API Compatibility, Data Migration

Description: Design a narrow object-storage abstraction and test authentication, metadata, checksums, versions, multipart uploads, lifecycle, events, and retention across providers.

---

S3 compatibility usually means a storage system implements some portion of the Amazon S3 HTTP API and signing behavior. It does not certify identical semantics, complete feature coverage, or operational interchangeability.

Google Cloud Storage documents interoperability through its XML API and also documents differences from Amazon S3. Other products publish their own supported S3 operations and limitations. Azure Blob Storage has its own REST and SDK surface rather than a native S3 endpoint, so an S3-only client is not a universal three-cloud abstraction.

Build portability around the object operations the application needs, then run the same contract tests against every supported target.

## Define the Smallest Useful Interface

Avoid exposing an entire provider SDK through a generic wrapper. A document service might need only:

```text
put(key, stream, content_type, checksum, conditions)
get(key, byte_range?, version?)
head(key)
delete(key, conditions)
list(prefix, cursor?)
create_download_url(key, expiry, response_headers?)
```

Return neutral values and preserve opaque provider identifiers:

```json
{
  "key": "tenant-42/invoice-7.pdf",
  "size": 182037,
  "contentType": "application/pdf",
  "contentChecksum": {
    "algorithm": "sha256",
    "value": "..."
  },
  "providerVersion": "opaque-value"
}
```

Do not treat a generic ETag as the application's content checksum. An Amazon S3 ETag can equal an MD5 digest for some upload and encryption combinations, but multipart construction and other cases produce different values, and other providers define their own entity tags. Calculate and store an application-selected checksum when content identity matters.

## Test API Coverage, Not the Compatibility Label

Create a capability matrix for exact operations:

| Capability | Required? | Test |
| --- | --- | --- |
| Conditional create | Yes | simultaneous writers; only one succeeds |
| Byte-range read | Yes | first, middle, and final ranges |
| Multipart upload | Yes | cancellation or cleanup, resume policy, final checksum |
| Version retrieval | Yes | overwrite, list, read old version |
| Server-side copy | No | feature flag or streamed fallback |
| Object lock | No | immutable-retention test when enabled |
| Event notification | Yes | create, overwrite, delete, duplicate delivery |

A client library can successfully list and upload while unsupported lifecycle, policy, or notification calls fail later. Run tests against the real service version and configuration.

## Make Authentication an Adapter

S3 Signature Version 4, Google HMAC interoperability, Google OAuth, Azure shared keys, SAS, and workload identity are different credential models.

Applications should receive short-lived credentials through the platform or call a storage adapter using each provider SDK's standard credential chain. Keep endpoint, signing region, addressing style, and credential source out of business code.

Presigned and signed URLs also differ. Test:

- supported HTTP methods;
- maximum and effective expiry;
- interaction with temporary credential expiry;
- headers included in the signature;
- upload size and checksum restrictions;
- revocation behavior;
- browser CORS configuration.

Amazon S3 notes that a presigned URL created with temporary credentials expires when those credentials expire, even if the URL contains a later expiry.

## Normalize Names Without Losing Meaning

Provider vocabulary differs:

| Application concept | Amazon S3 | Google Cloud Storage | Azure Blob Storage |
| --- | --- | --- | --- |
| Container of objects | bucket | bucket | container inside a storage account |
| Object revision | version ID | generation | version ID when versioning is enabled |
| User metadata | `x-amz-meta-*` | `x-goog-meta-*` or API fields | `x-ms-meta-*` |
| Conditional revision | ETag preconditions; version ID selects a revision | generation/metageneration preconditions | ETag preconditions; version ID selects a revision |

Keep provider revision values opaque. Do not parse them or assume they sort chronologically. If the application needs its own immutable version, write an application ID in metadata or the database.

Object keys are provider-constrained string names, not filesystem paths. Test UTF-8 and Unicode normalization behavior, reserved characters, leading delimiters, repeated delimiters, and maximum encoded lengths. Avoid key conventions that work only with one provider's console or addressing mode.

## Specify Consistency and Concurrency

Modern object stores may provide strong consistency for many basic operations, but the exact contract for configuration, notifications, replication, and caches can differ. Write the application around documented operations rather than folklore.

Use conditional requests for concurrency:

```text
create only if absent
replace only if current revision equals X
delete only if current revision equals X
```

Map these to the provider's precondition mechanisms and test races. A prior `HEAD` followed by unconditional `PUT` is not an atomic create.

Define list pagination behavior in your abstraction. Continuation tokens are opaque and provider-specific; never persist one as a durable business cursor unless the provider contract explicitly supports that use.

## Design Multipart Uploads Carefully

Multipart and resumable uploads vary in minimum part size, maximum part count, checksum calculation, session lifetime, and completion rules. Google documents several XML API differences from S3, including cases involving V4 signatures, chunked transfer encoding, encryption keys, and lifecycle request syntax.

Put multipart logic inside the adapter. Persist enough application state to restart safely, but treat upload IDs, session URIs, and block IDs as provider-local. On cancellation or failure, explicitly abort sessions where supported, define cleanup behavior where they are not, and monitor incomplete-upload storage.

After completion, verify a content checksum selected before the upload. Do not compare multipart ETags across providers as proof that bytes match.

## Keep Management Features Outside the Data API

Bucket policies, IAM, encryption, keys, lifecycle, replication, retention, object lock, inventory, logging, and event destinations are control-plane concerns. Implement them with provider-specific infrastructure modules.

Define intent separately:

```yaml
storage_intent:
  public_access: denied
  version_history_days: 30
  incomplete_upload_expiry_days: 7
  immutable_retention_days: 0
  encryption: provider_managed
  create_events: required
```

Each provider implementation either proves the intent or reports an unsupported capability. Similar names do not imply identical retention or legal-hold behavior.

## Make Events Idempotent

Object event systems differ in transport, filtering, ordering, retry, and payload. Treat an event as a hint to inspect current object state, not unquestionable proof of a unique transition.

Create a neutral envelope at the adapter boundary:

```json
{
  "eventId": "adapter-deduplication-key",
  "eventType": "object.created",
  "container": "documents",
  "key": "tenant-42/invoice-7.pdf",
  "providerVersion": "opaque-value",
  "occurredAt": "2026-08-04T10:15:00Z"
}
```

Deduplicate by a durable event or operation key, tolerate redelivery, and fetch object metadata conditionally. Test overwrite and delete races.

## Rehearse Data Movement

Inventory objects with key, size, application checksum, version policy, retention state, and encryption requirements. Copy into a new namespace, verify checksums, compare counts and total bytes, then run application reads from the destination.

Account for old versions, delete markers, incomplete uploads and uncommitted blocks, metadata, tags, legal holds, and lifecycle rules. A tool that copies only current object bytes may be correct for one migration and unacceptable for another.

Measure source request charges, destination writes, transfer tooling, and egress. Keep the source read-only during the final delta or use a clear authoritative-writer strategy.

## Official Documentation

- [Amazon S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)
- [Amazon S3 object integrity and checksums](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html)
- [Amazon S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Google Cloud Storage interoperability](https://cloud.google.com/storage/docs/interoperability)
- [Google Cloud migration differences from Amazon S3](https://cloud.google.com/storage/docs/migrating)
- [Azure Blob Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)
- [Azure Blob Storage versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Oracle Cloud S3 Compatibility API](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm)

## Conclusion

S3 compatibility is a useful client starting point, not a portability guarantee. Define a narrow data-plane interface, preserve provider revisions as opaque values, maintain application checksums, and test every required semantic. Keep identity and management features in explicit provider adapters, and prove a full data copy before relying on an exit.
