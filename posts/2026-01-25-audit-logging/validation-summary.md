# Validation Summary: How to Implement Audit Logging

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- TypeScript
- Node.js crypto module
- Express middleware
- AWS SDK for JavaScript v3
- Amazon S3 Object Lock
- PostgreSQL triggers and JSONB
- Audit logging and compliance retention concepts

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Express API reference: https://expressjs.com/en/api/
- AWS S3 Object Lock user guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS SDK for JavaScript v3 S3 examples and API reference: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- PostgreSQL CREATE TRIGGER documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL system administration functions documentation for current_setting: https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found
- The `AuditLogger.log` input type omitted `metadata`, but the implementation read `event.metadata`. Added an `AuditEventInput` type that allows optional correlation/request metadata.
- The HMAC signing code used `JSON.stringify` with only top-level sorted keys, which meant nested audit fields were not reliably included in the signature. Replaced it with recursive canonical serialization.
- `crypto.timingSafeEqual` can throw when buffers have different lengths. Added hex decoding and a length check before comparison.
- The middleware declared response-body capture but never wrote the captured body to the audit event. Removed the unused response-body capture option and interception code.
- The append-only storage class claimed to implement `AuditStorage` but lacked `read`, `query`, and `readRange`, and its integrity verification used a placeholder `AuditLogger` constructor that would not type-check. Added minimal file-backed methods and injected an `AuditVerifier`.
- The S3 example used AWS SDK for JavaScript v2, which reached end-of-support on September 8, 2025. Updated it to AWS SDK for JavaScript v3 with `S3Client` and `PutObjectCommand`.
- The S3 Object Lock comment implied `putObject` enabled Object Lock. Corrected the comment to state that the bucket must already have S3 Object Lock enabled.
- The PostgreSQL delete trigger allowed deletes by default when `audit.retention_cleanup` was unset because `current_setting(..., true)` returns NULL. Added `COALESCE(..., false)` so deletes are denied unless retention cleanup is explicitly enabled.

## Review Notes
The examples are still tutorial snippets rather than a complete production package. A production audit log system should also address key rotation, multi-process hash-chain coordination, redaction of sensitive request parameters, privileged database roles that can bypass triggers, S3 bucket-level Object Lock configuration, and operational alerting when audit writes fail.
