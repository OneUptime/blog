# Validation Summary: What S3 Compatibility Does Not Guarantee

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- Amazon S3 REST API and Signature Version 4
- Google Cloud Storage XML and JSON APIs
- Azure Blob Storage REST API
- Oracle Cloud Infrastructure Object Storage S3 Compatibility API
- Object versioning and conditional requests
- Multipart, resumable, and block blob uploads
- Object checksums and ETags
- Presigned URLs, signed URLs, SAS, HMAC, OAuth, and workload identity
- Object lifecycle, retention, legal holds, replication, and event notifications
- Cross-provider object-storage migration

## Sources Consulted

- [Amazon S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)
- [Amazon S3: Checking object integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html)
- [Amazon S3: Checking object integrity for data uploads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html)
- [Amazon S3: Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Amazon S3: Conditional requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-requests.html)
- [Amazon S3: Event notifications](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html)
- [Amazon S3: AbortMultipartUpload](https://docs.aws.amazon.com/AmazonS3/latest/API/API_AbortMultipartUpload.html)
- [Google Cloud Storage interoperability](https://cloud.google.com/storage/docs/interoperability)
- [Google Cloud Storage migration differences from Amazon S3](https://cloud.google.com/storage/docs/migrating)
- [Google Cloud Storage request preconditions](https://cloud.google.com/storage/docs/request-preconditions)
- [Google Cloud Storage resumable uploads](https://cloud.google.com/storage/docs/resumable-uploads)
- [Google Cloud Storage XML API: Abort a multipart upload](https://cloud.google.com/storage/docs/xml-api/delete-multipart)
- [Google Cloud Storage Pub/Sub notifications](https://cloud.google.com/storage/docs/pubsub-notifications)
- [Azure Blob Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)
- [Azure Blob Storage conditional headers](https://learn.microsoft.com/en-us/rest/api/storageservices/specifying-conditional-headers-for-blob-service-operations)
- [Azure Blob Storage versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Azure Blob Storage Put Block](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block)
- [Azure Event Grid delivery and retry](https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry)
- [Oracle Cloud Object Storage Amazon S3 Compatibility API](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm)
- [Oracle Cloud supported S3-compatible operations](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi_topic-Amazon_S3_Compatibility_API_Support.htm)

## Issues Found

- The provider-vocabulary table described S3 and Azure version IDs as conditional-request mechanisms. Version IDs select a stored revision, while ETags are used for the write and delete preconditions discussed later in the post. The row now distinguishes ETag preconditions from version selection.
- The multipart guidance assumed that every provider exposes an abortable session identified by an upload ID. Amazon S3 and the Google Cloud Storage XML multipart API expose upload IDs and abort operations, while Google resumable uploads use session URIs and Azure block blob uploads use block IDs and automatic cleanup of uncommitted blocks. The capability test and guidance now say cancellation or cleanup, qualify explicit aborts with "where supported," and preserve all provider-local identifier types.
- The event-envelope example used a provider event ID as its deduplication value. Google Cloud Storage documents that at-least-once Pub/Sub delivery can produce multiple messages with different message IDs for the same storage event. The placeholder now requires an adapter deduplication key, consistent with the following instruction to use a durable event or operation key.
- The migration checklist referred only to incomplete multipart uploads. It now also names incomplete uploads and uncommitted blocks so that Google resumable uploads and Azure block blob staging are covered.

## Review Notes

- The JSON example and abstract YAML intent example are syntactically valid. The text interface is pseudocode rather than a language-specific API.
- No runnable terminal commands or version-pinned SDK examples are present.
- Upload limits, checksum support, event guarantees, versioning support, and signed-URL behavior remain provider-, API-, account-, and service-version-specific, so the post's contract-testing recommendation is appropriate.
