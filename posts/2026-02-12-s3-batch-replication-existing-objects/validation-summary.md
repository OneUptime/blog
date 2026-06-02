# Validation Summary: How to Use S3 Batch Replication for Existing Objects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Batch Operations
- S3 Batch Replication
- AWS CLI
- IAM policies
- Python boto3

## Sources Consulted
- AWS CLI Command Reference: `s3control create-job` - https://docs.aws.amazon.com/cli/latest/reference/s3control/create-job.html
- Amazon S3 User Guide: Replicating existing objects with Batch Replication - https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-batch-replication-batch.html
- Amazon S3 User Guide: Granting permissions for Batch Operations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-iam-role-policies.html
- Amazon S3 API Reference: S3JobManifestGenerator - https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_S3JobManifestGenerator.html
- Amazon S3 User Guide: Examples: S3 Batch Operations completion reports - https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-examples-reports.html
- Amazon S3 User Guide: Requirements and considerations for replication - https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-and-other-bucket-configs.html

## Issues Found
- The `aws s3control create-job` examples used `SourceS3BucketArn` inside `S3JobManifestGenerator`. Current AWS CLI and S3 Control API documentation use the required field name `SourceBucket`. Updated all three examples.
- The "all existing objects" batch replication job filtered for `NONE`, `FAILED`, and `REPLICA` statuses but omitted `COMPLETED`. AWS documents `COMPLETED` as the status to include when backfilling a destination with objects already replicated to another destination. Added `COMPLETED` to the first broad job example and the explanatory list.
- The post omitted the requirement that an S3-generated manifest must be stored in the same AWS Region as the source bucket. Added this prerequisite near the versioning requirements.

## Review Notes
The AWS CLI is not installed in the workspace, so command validation was performed against official AWS CLI and Amazon S3 documentation. The Python boto3 verification snippet is syntactically valid, but it compares only current object counts and total current object size; it does not verify object versions, checksums, metadata, delete markers, or replication status.
