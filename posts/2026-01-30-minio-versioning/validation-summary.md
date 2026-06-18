# Validation Summary: How to Implement MinIO Versioning

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MinIO object versioning
- MinIO Client (`mc`)
- Amazon S3-compatible versioning APIs
- AWS CLI `s3api`
- Python 3 and boto3
- S3 lifecycle management and object lock retention

## Sources Consulted
- MinIO AIStor object versioning documentation: https://docs.min.io/aistor/administration/objects-and-versioning/versioning/
- MinIO AIStor `mc version enable` documentation: https://docs.min.io/aistor/reference/cli/mc-version/mc-version-enable/
- MinIO AIStor `mc version suspend` documentation: https://docs.min.io/aistor/reference/cli/mc-version/mc-version-suspend/
- MinIO AIStor `mc ilm rule add` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-rule/mc-ilm-rule-add/
- MinIO AIStor lifecycle rule patterns: https://docs.min.io/aistor/administration/object-lifecycle-management/lifecycle-rule-patterns/
- MinIO AIStor `mc ls`, `mc cp`, `mc cat`, and `mc rm` documentation for version flags: https://docs.min.io/aistor/reference/cli/
- MinIO AIStor `mc retention set` documentation: https://docs.min.io/aistor/reference/cli/mc-retention/mc-retention-set/
- Amazon S3 versioning workflows: https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html
- Amazon S3 delete marker documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html
- Amazon S3 managing delete markers documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManagingDelMarkers.html
- AWS CLI `put-bucket-versioning` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- boto3 S3 `list_object_versions` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_object_versions.html
- boto3 S3 `put_bucket_lifecycle_configuration` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_bucket_lifecycle_configuration.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The examples that listed versions for a "specific object" used `Prefix=object_key` but did not filter exact key matches. Since S3-compatible `Prefix` matching can include other keys with the same prefix, the examples could display, retrieve, or delete versions for unintended objects. Added exact `Key == object_key` filtering where the examples operate on a single object.
- The lifecycle viewing example attempted to catch `s3_client.exceptions.ClientError`, but boto3 uses `botocore.exceptions.ClientError` for generic service errors. Added the correct import and exception handler.
- The configuration manager used `datetime.utcnow()`, which is deprecated in current Python versions. Replaced it with timezone-aware `datetime.now(timezone.utc).isoformat()`.
- The automated cleanup script calculated the cutoff date with `replace(day=cutoff.day - older_than_days)`, which can raise `ValueError` across month boundaries. Replaced it with `timedelta(days=older_than_days)`.
- The audit trail example imported `datetime` but did not use it. Removed the unused import while touching that snippet.

## Review Notes
The core MinIO versioning behavior, delete marker explanations, `mc` version commands, AWS CLI versioning commands, boto3 versioning calls, lifecycle configuration fields, and object lock retention command were consistent with the consulted official documentation. Python snippets were syntax-checked after edits.
