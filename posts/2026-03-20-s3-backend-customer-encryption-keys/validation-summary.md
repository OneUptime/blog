# Validation Summary: How to Configure S3 Backend with Customer-Provided Encryption Keys in Open (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu S3 backend
- Terraform/OpenTofu backend configuration
- Amazon S3 SSE-C
- AWS Secrets Manager
- AWS CLI
- AWS CloudTrail

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- Amazon S3 SSE-C user guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html
- Amazon S3 SSE-C request header documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-s3-c-encryption.html
- AWS CLI `aws s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI binary/blob parameter documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-types.html
- AWS KMS CloudTrail logging documentation: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- Amazon S3 CloudTrail event logging documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html

## Issues Found
- The backend example used unsupported S3 backend attributes `sse_customer_algorithm` and `sse_customer_key_md5`. OpenTofu documents only `sse_customer_key` for SSE-C, with `AWS_SSE_CUSTOMER_KEY` as the recommended source. I removed the unsupported attributes and documented the environment variable approach.
- The post stored the SSE-C key through `TF_VAR_ssec_key`. Although current OpenTofu can evaluate some variables in backend configuration, OpenTofu explicitly recommends environment variables for sensitive backend values. I changed the example to use `AWS_SSE_CUSTOMER_KEY`.
- The rotation example passed base64-encoded keys directly to `aws s3 cp --sse-c-key` and did not provide the old source key while encrypting the destination with the new key. AWS CLI high-level `s3 cp` SSE-C flags expect raw key bytes. I changed the example to decode the base64 keys to temporary files and pass them with `fileb://`, using the old key for the copy source and the new key for the destination.
- The rotation section did not account for S3 versioned buckets, where each object version can have its own SSE-C key. I added a concise caveat to rotate needed versions or retain old keys.
- The post did not mention AWS's April 2026 SSE-C default-disable change for new general purpose buckets and some existing accounts. I added a note to make sure SSE-C is not blocked for the state bucket.
- The comparison table's "CloudTrail audit" row was ambiguous and overstated SSE-S3 as having no CloudTrail audit at all. I narrowed it to CloudTrail key usage auditing, where SSE-KMS has KMS key-use events and SSE-C/SSE-S3 do not provide KMS key-use audit events.

## Review Notes
The corrected post now matches the documented OpenTofu S3 backend option names and the AWS CLI key encoding requirements. Future improvements could include a complete rotation script that iterates over all current object keys and, when needed, all object versions.
