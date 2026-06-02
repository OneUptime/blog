# Validation Summary: How to Use S3 Glacier for Long-Term Archival Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 storage classes
- S3 Glacier Instant Retrieval
- S3 Glacier Flexible Retrieval
- S3 Glacier Deep Archive
- S3 Lifecycle configuration
- AWS CLI
- Boto3
- Amazon CloudWatch S3 storage metrics
- S3 Object Lock and Versioning

## Sources Consulted
- Amazon S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- Amazon S3 Glacier storage class pricing and minimum storage notes: https://aws.amazon.com/s3/pricing/
- AWS CLI `s3 cp` storage-class values: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI `put-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Amazon S3 Lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 RestoreObject API: https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html
- Boto3 S3 `put_object` API: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html
- Amazon S3 CloudWatch metrics and storage-type dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html

## Issues Found
- The small-object cost tip described "Glacier" as charging a 40KB minimum per object. AWS documents this as 40KB of additional metadata for S3 Glacier Flexible Retrieval and S3 Glacier Deep Archive, while S3 Glacier Instant Retrieval has a 128KB minimum billable object size. Updated the wording and the shell-comment note.
- The lifecycle policy section did not mention the current default behavior that new or modified lifecycle configurations do not transition objects smaller than 128KB to any storage class. Added a short caveat before the lifecycle JSON.

## Review Notes
Pricing values in the post are plausible for common US-region examples, but S3 prices vary by AWS Region and can change over time. The CloudWatch example uses `GlacierStorage`, which reports S3 Glacier Flexible Retrieval object bytes; Deep Archive and Glacier Instant Retrieval require separate `StorageType` values such as `DeepArchiveStorage` and `GlacierInstantRetrievalStorage`.
