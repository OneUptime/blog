# Validation Summary: How to Use S3 Batch Operations to Process Millions of Objects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Batch Operations
- AWS CLI
- AWS IAM
- Amazon S3 Inventory and CSV manifests
- AWS Lambda
- Python with boto3 and Pillow

## Sources Consulted
- AWS S3 User Guide: Operations supported by S3 Batch Operations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-operations.html
- AWS S3 User Guide: Creating an S3 Batch Operations job - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-create-job.html
- AWS CLI Command Reference: s3control create-job - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3control/create-job.html
- AWS CLI Command Reference: s3control update-job-status - https://docs.aws.amazon.com/cli/latest/reference/s3control/update-job-status.html
- AWS S3 User Guide: Invoke AWS Lambda function with S3 Batch Operations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-invoke-lambda.html
- AWS Lambda Developer Guide: Invoke a Lambda function with Amazon S3 batch events - https://docs.aws.amazon.com/lambda/latest/dg/services-s3-batch.html

## Issues Found
- The CSV manifest description said the format was just bucket name and object key. AWS documentation states manually created CSV manifest object keys must be URL-encoded. Updated the text to specify URL-encoded object keys.
- The IAM policy example omitted `s3:GetBucketLocation` for the manifest and report buckets, which AWS includes in its Batch Operations IAM examples. Added bucket-level resources and `s3:GetBucketLocation` where needed.
- The cross-region copy example did not specify the job Region. AWS requires copy jobs to be created in the same Region as the destination bucket. Added `--region eu-west-1` and a short note.
- The Lambda example used `task['s3Key']` directly. AWS documents that S3 Batch Operations keys are URL-encoded in Lambda events. Added `urllib.parse.unquote_plus`.
- The Lambda section did not state that the Batch Operations role needs `lambda:InvokeFunction`. Added that requirement before the Lambda create-job command.
- The Lambda example extracted the bucket using `split(':::')`. AWS examples use the last ARN segment, which is more robust across documented event examples. Updated it to `split(':')[-1]`.

## Review Notes
The examples remain illustrative and still require operation-specific IAM tightening for production use, especially copy jobs, encrypted manifests or objects, versioned object manifests, Object Lock operations, and Lambda execution-role permissions.
