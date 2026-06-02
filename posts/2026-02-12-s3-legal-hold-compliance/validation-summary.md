# Validation Summary: How to Use S3 Legal Hold for Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3 Object Lock
- S3 Legal Hold
- AWS CLI
- Boto3 for Python
- IAM policies
- S3 Batch Operations
- AWS CloudTrail
- AWS Lambda
- Amazon DynamoDB

## Sources Consulted
- Amazon S3 User Guide: Locking objects with Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- Amazon S3 User Guide: Configuring S3 Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Amazon S3 User Guide: Object Lock considerations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- Amazon S3 User Guide: S3 Object Lock legal hold with Batch Operations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-legal-hold.html
- Amazon S3 API Reference: PutObjectLegalHold - https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObjectLegalHold.html
- AWS CLI Command Reference: create-bucket - https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI Command Reference: put-object-legal-hold - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3api/put-object-legal-hold.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Boto3 S3 client documentation: put_object_legal_hold - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object_legal_hold.html

## Issues Found
- The bucket creation command used `--object-lock-enabled-for-object-configuration`, which is not the current AWS CLI `create-bucket` option. Changed it to `--object-lock-enabled-for-bucket`.
- The prerequisite said Object Lock must be enabled only at bucket creation time. AWS now supports enabling Object Lock on existing versioned general purpose buckets, and Object Lock cannot be disabled afterward. Updated the wording.
- The bulk Python example implied it applied holds to all object versions under a prefix. `list_objects_v2` lists current objects, and legal holds are version-specific. Updated the wording and comment to say current object versions.
- The CloudTrail audit section did not mention that S3 data events must be enabled for object-level activity. Added that prerequisite and made the legal hold status extraction tolerant of either `Status` or `status` casing.
- The delete behavior section said any delete attempt returns `AccessDenied`. AWS distinguishes permanent deletes with a version ID from simple deletes without a version ID: permanent deletes fail for protected versions, while simple deletes can create a delete marker. Updated the explanation.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI and Amazon S3 documentation instead of local `--help` output.
