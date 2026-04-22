# Validation Summary: How to Configure S3 Backend with Native State Locking in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- S3 backend state storage
- Native S3 state locking
- Amazon S3 conditional writes
- AWS IAM
- AWS KMS / SSE-KMS
- DynamoDB state locking migration

## Sources Consulted
- OpenTofu 1.10 release notes, native S3 state locking: https://opentofu.org/docs/v1.10/intro/whats-new/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `force-unlock` command documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu S3 backend source code for lock object suffix and conditional write behavior: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/s3/client.go
- Amazon S3 conditional writes documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html
- Amazon S3 SSE-KMS permissions documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html

## Issues Found
- The prerequisites incorrectly implied that S3 Object Lock capability or region-specific conditional write support was required. Changed this to require an S3 bucket for state storage and AWS S3, or an S3-compatible service that supports conditional `If-None-Match` writes.
- The post used the wrong native lock object name, `.tfstate.lock`. OpenTofu appends `.tflock` to the state key, so the example lock path was corrected to `prod/terraform.tfstate.tflock`.
- The force-unlock section listed and removed the wrong lock path. Updated the AWS CLI examples to use the exact `prod/terraform.tfstate.tflock` object.
- The IAM section omitted a KMS caveat even though the bucket example enables SSE-KMS. Added a note that customer-managed KMS keys also require the relevant KMS permissions.

## Review Notes
DynamoDB locking remains supported, and OpenTofu supports a phased migration where `use_lockfile` and `dynamodb_table` are temporarily configured together before removing DynamoDB locking. The post's direct migration path is valid when all runners and configurations are migrated together, but a phased migration is safer for teams with mixed clients.
