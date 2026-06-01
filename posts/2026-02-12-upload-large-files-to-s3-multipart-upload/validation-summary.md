# Validation Summary: How to Upload Large Files to S3 Using Multipart Upload

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3 multipart upload
- AWS CLI `s3` and `s3api` commands
- S3 lifecycle configuration
- Python boto3 S3 transfer manager
- AWS SDK for JavaScript v3 `@aws-sdk/lib-storage`
- S3 Transfer Acceleration

## Sources Consulted
- Amazon S3 multipart upload overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html
- Amazon S3 multipart upload limits: https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
- AWS CLI S3 configuration: https://docs.aws.amazon.com/cli/latest/topic/s3-config.html
- AWS CLI `complete-multipart-upload` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/complete-multipart-upload.html
- AWS CLI `upload-part` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/upload-part.html
- AWS CLI `put-bucket-lifecycle-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Amazon S3 lifecycle cleanup for incomplete multipart uploads: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html
- Boto3 S3 transfer configuration guide: https://docs.aws.amazon.com/boto3/latest/guide/s3.html
- Boto3 `upload_file` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/upload_file.html
- AWS SDK for JavaScript v3 `@aws-sdk/lib-storage` documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/
- Amazon S3 object integrity documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html
- Amazon S3 Transfer Acceleration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html

## Issues Found
- The lifecycle configuration used `"Filter": {}`. Current AWS CLI documentation says a lifecycle rule filter must specify exactly one predicate, such as `Prefix`. I changed it to `"Filter": { "Prefix": "" }` so the rule applies to all objects.
- The Node.js example imported low-level multipart commands that were not used. I changed the import to only include `S3Client`, matching the `Upload` abstraction shown in the example.
- The Node.js progress calculation divided by `progress.total`, which can be unavailable for streamed bodies. I changed the example to read the local file size with `fs.statSync(filePath).size` and calculate progress from that value.
- The performance estimate said a 10 GB file at 50 MB/s would finish in about 40 seconds with 5 concurrent uploads. If 50 MB/s is the measured total throughput, the wall time is about 200 seconds. I corrected the estimate.
- The integrity section stated that S3 uses MD5 checksums for each part. Current S3 documentation supports multiple checksum algorithms and notes that multipart ETags are not the MD5 checksum of the complete object. I updated the wording to describe checksum validation and multipart ETags more accurately.

## Review Notes
The core multipart upload flow, AWS CLI multipart configuration keys, part size and part count limits, boto3 `TransferConfig` usage, `upload_file` callback usage, and JavaScript `Upload` configuration are technically correct after the fixes above. The AWS CLI was not installed locally in the review environment, so command verification was performed against current official AWS documentation.
