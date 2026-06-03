# Validation Summary: How to Empty and Delete an S3 Bucket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- AWS CLI
- Boto3
- S3 Lifecycle configuration
- S3 Versioning
- S3 Object Lock
- S3 Replication
- CloudFormation
- Terraform AWS provider

## Sources Consulted
- AWS CLI `s3 rb` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/rb.html
- AWS CLI S3 high-level commands guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html
- Amazon S3 DeleteBucket API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html
- Amazon S3 empty bucket guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/empty-bucket.html
- Amazon S3 lifecycle configuration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- Amazon S3 lifecycle configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Boto3 S3 Bucket object_versions documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/bucket/object_versions.html
- Boto3 S3 list_multipart_uploads documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_multipart_uploads.html
- Boto3 S3 ListMultipartUploads paginator documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/paginator/ListMultipartUploads.html
- Amazon S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS CLI `delete-object` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-object.html
- AWS CLI `delete-bucket-replication` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-bucket-replication.html
- Terraform AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The post stated that a general S3 bucket cannot be deleted unless there are no incomplete multipart uploads. AWS documents remaining objects, object versions, and delete markers as the general purpose bucket deletion blockers, while incomplete multipart uploads should be cleaned up to avoid storage charges and are specifically a deletion blocker for directory buckets. Updated the wording to reflect that distinction.
- The Boto3 script called `list_multipart_uploads` once, which only returns up to 1,000 multipart uploads. Updated it to use the `list_multipart_uploads` paginator before aborting uploads.
- The large-bucket section said lifecycle processing can take "up to 48 hours." AWS documents lifecycle expiration as asynchronous and says it might take some days, without a strict 48-hour upper bound. Updated the wording accordingly.
- The replication section implied replication configuration blocks bucket deletion. Official deletion requirements do not list replication configuration as a bucket deletion blocker. Updated the section to frame replication removal as part of decommissioning to stop further replication work.
- The multi-bucket script comment said `aws s3 rm --recursive` removes all objects and versions. That command removes current objects and does not permanently remove all versioned object versions. Updated the comment; the following Boto3 line handles versions.

## Review Notes
- The main commands and configuration snippets are valid for general purpose S3 buckets. Directory buckets have different API limitations and endpoint requirements that are outside this post's scope.
- The post correctly notes that `aws s3 rb --force` removes non-versioned objects but does not fully empty versioned buckets.
- The lifecycle rule uses an empty filter, which is a valid way to apply the rule to all objects in the bucket.
