# Validation Summary: How to Create MinIO Object Locking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MinIO AIStor / MinIO object locking
- MinIO Client (`mc`)
- Amazon S3-compatible Object Lock API
- Python boto3
- IAM policy permissions
- WORM retention and legal holds

## Sources Consulted
- MinIO AIStor Object Locking and Immutability: https://docs.min.io/aistor/administration/object-locking-and-immutability/
- MinIO AIStor `mc mb` reference: https://docs.min.io/aistor/reference/cli/mc-mb/
- MinIO AIStor `mc retention set` reference: https://docs.min.io/aistor/reference/cli/mc-retention/mc-retention-set/
- MinIO AIStor `mc retention info` reference: https://docs.min.io/aistor/reference/cli/mc-retention/mc-retention-info/
- MinIO AIStor `mc legalhold` reference: https://docs.min.io/aistor/reference/cli/mc-legalhold/
- MinIO AIStor `mc rm` reference: https://docs.min.io/aistor/reference/cli/mc-rm/
- MinIO AIStor `mc find` reference: https://docs.min.io/aistor/reference/cli/mc-find/
- AWS S3 Object Lock user guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- boto3 `create_bucket` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/create_bucket.html
- boto3 `put_object_lock_configuration` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object_lock_configuration.html
- boto3 `put_object` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html
- boto3 `put_object_legal_hold` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object_legal_hold.html
- boto3 `get_object_legal_hold` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_object_legal_hold.html
- boto3 `delete_object` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/delete_object.html

## Issues Found
- The post described object locking as applying to objects generally. S3 Object Lock applies to object versions, and simple deletes can create delete markers while protected versions remain locked. Updated the wording and diagram label to refer to protected object versions.
- The post said object locking cannot be enabled on existing buckets. Current MinIO AIStor documentation says releases beginning with `RELEASE.2025-05-20T20-30-00Z` can enable object locking on existing buckets through `mc retention set --default`; older releases required enabling at creation. Updated the statement to include this version-specific caveat.
- The `mc mb` example placed `--with-lock` after the bucket path. The documented syntax is `mc mb --with-lock ALIAS/BUCKET`. Updated the command.
- The default retention verification command used `mc retention info` on a bucket without `--default`. The documented example for bucket default object lock configuration uses `mc retention info --default`. Updated the command.
- The boto3 `put_object` example uploaded with an explicit retention period but did not send `ContentMD5` or `ChecksumAlgorithm`, which AWS S3 requires for Object Lock retention uploads. Added `ChecksumAlgorithm='SHA256'`.
- The boto3 retention timestamp used `datetime.utcnow()`, which returns a naive datetime. Updated it to `datetime.now(timezone.utc)` and used a context manager for the file body.
- The monitoring examples assumed undocumented `mc find --json` retention and legal hold fields. Replaced them with documented recursive `mc retention info` and `mc legalhold info` commands.

## Review Notes
- The regulatory retention table is intentionally high-level. Actual SEC, HIPAA, SOX, GDPR, and litigation retention requirements vary by record type, jurisdiction, and organizational policy, so production users should validate retention periods with legal or compliance counsel.
- The boto3 examples target S3-compatible APIs. Exact behavior on MinIO can vary by MinIO/AIStor release, especially around enabling Object Lock on existing buckets.
