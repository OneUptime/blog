# Validation Summary: How to Recover Deleted Objects from a Versioned S3 Bucket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Versioning
- S3 delete markers
- AWS CLI `s3` and `s3api`
- S3 Object Lock
- S3 Batch Operations
- Bash
- Python

## Sources Consulted
- AWS S3 User Guide: Working with delete markers - https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html
- AWS S3 User Guide: Managing delete markers - https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManagingDelMarkers.html
- AWS S3 User Guide: How S3 Versioning works - https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html
- AWS S3 User Guide: Deleting Amazon S3 objects - https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjects.html
- AWS CLI Command Reference: `list-object-versions` - https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI Command Reference: `delete-object` - https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-object.html
- AWS CLI Command Reference: `delete-objects` - https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-objects.html
- AWS CLI Command Reference: `copy-object` - https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html
- AWS CLI Command Reference: `put-object-retention` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-retention.html
- AWS S3 User Guide: Configuring MFA Delete - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html
- AWS S3 User Guide: Operations supported by S3 Batch Operations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-operations.html

## Issues Found
- The post described a delete marker as a "zero-byte object." AWS documents delete markers as placeholders with no data; their billed storage size is based on the key name. Changed the wording to "special placeholder."
- The single-object prefix recovery script used plain `read`, which can split keys incorrectly. Changed it to tab-delimited `IFS` with `read -r` for safer parsing of AWS CLI text output.
- The batch recovery script defined `BUCKET` and `BATCH_SIZE` but the embedded Python hardcoded `my-bucket` and a batch size of `1000`. Updated the Python code to read those values from the environment.
- The batch recovery script captured the AWS CLI result but did not check for errors. Updated `subprocess.run` to use `check=True` so failures stop the script.
- The point-in-time script only identified versions to restore; it did not actually restore objects. Updated the surrounding text and script comment to say it identifies versions current at the timestamp.
- The Object Lock example did not state the prerequisite that Object Lock must already be enabled on the bucket. Added that caveat.
- The IAM prevention note only mentioned `s3:DeleteObject`. Added `s3:DeleteObjectVersion`, which is required to delete specific versions and delete markers.
- The S3 Batch Operations section implied Batch Operations can directly delete delete markers. AWS's supported Batch Operations list does not include a native delete-object operation. Updated the text to describe using Batch Operations with Lambda to call `DeleteObject`.

## Review Notes
- The AWS CLI was not installed in the local workspace, so command verification was done against official AWS documentation rather than local `aws --help` output.
- The core recovery flow is correct for general purpose S3 buckets with versioning enabled: list object versions, identify the latest delete marker, and delete that marker by version ID to make the prior object version current again.
- For object keys containing commas, quotes, tabs, or newlines, production scripts should generate CSV/JSON manifests with a proper serializer rather than simple text pipelines.
