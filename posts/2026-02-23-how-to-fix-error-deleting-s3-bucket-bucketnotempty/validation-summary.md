# Validation Summary: How to Fix Error Deleting S3 Bucket BucketNotEmpty

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Terraform (`aws_s3_bucket`, `aws_s3_bucket_lifecycle_configuration`)
- AWS S3 (versioning, delete markers, multipart uploads, lifecycle policies)
- AWS CLI (`aws s3`, `aws s3api`, `aws s3control`)
- AWS S3 Batch Operations
- Bash scripting (with `jq` and Python)

## Sources Consulted
- Terraform AWS provider docs — `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider docs — `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS S3 Control API — `JobOperation`: https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_JobOperation.html
- AWS S3 Control API — `CreateJob`: https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_CreateJob.html
- AWS CLI reference — `s3control create-job`: https://docs.aws.amazon.com/cli/latest/reference/s3control/create-job.html
- AWS docs — Invoke a Lambda function with S3 batch events: https://docs.aws.amazon.com/lambda/latest/dg/services-s3-batch.html
- AWS CLI reference — `s3api list-object-versions`, `delete-object`, `list-multipart-uploads`, `abort-multipart-upload`

## Issues Found
1. **Fix 4 used a non-existent S3 Batch Operations operation.** The original example specified `'{"S3DeleteObject":{}}'` as the operation for `aws s3control create-job`. S3 Batch Operations does not have a native `S3DeleteObject` action — the `JobOperation` API only supports `LambdaInvoke`, `S3PutObjectCopy`, `S3PutObjectAcl`, `S3PutObjectTagging`, `S3DeleteObjectTagging` (tags only), `S3PutObjectLegalHold`, `S3PutObjectRetention`, `S3InitiateRestoreObject`, `S3ReplicateObject`, `S3UpdateObjectEncryption`, and `S3ComputeObjectChecksum`. The documented pattern for bulk deletion via Batch Operations is to use `LambdaInvoke` against a Lambda that calls `DeleteObject`/`DeleteObjects`. Replaced the operation JSON with `'{"LambdaInvoke":{"FunctionArn":"..."}}'` and added a sentence explaining that there is no native delete action.

2. **`aws_s3_bucket_lifecycle_configuration` rules were missing a `filter` block.** Both lifecycle config examples (Fix 3 and the Best Practices section) declared a `rule` block with no `filter` or `prefix`. Recent AWS provider versions strongly recommend an explicit `filter {}` (apply to all objects) — omitting it produces a deprecation warning and rules without a filter cannot later be updated to use only a prefix. Added `filter {}` to both rule blocks.

## Review Notes
- The `force_destroy` argument behavior is described correctly, including the irreversibility caveat.
- AWS CLI commands (`aws s3 rm --recursive`, `aws s3api list-object-versions`, `delete-object`, `list-multipart-uploads`, `abort-multipart-upload`) and their flags are accurate.
- The CI/CD pre-destroy bash script works but is fragile: `read key version` with unquoted IFS will break on object keys containing whitespace or special characters, and parsing `terraform state show` text output is brittle compared to `terraform show -json`. These are pragmatic shortcuts rather than incorrect code, so they were left as-is.
- The `--query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}'` example wraps results in an `Objects` key purely for inspection; the actual delete loop uses the correct flatter query. Both queries are valid JMESPath against `list-object-versions` output.
- The manifest format `S3InventoryReport_CSV_20161130` and report format `Report_CSV_20180820` in Fix 4 are both valid values for their respective fields.
