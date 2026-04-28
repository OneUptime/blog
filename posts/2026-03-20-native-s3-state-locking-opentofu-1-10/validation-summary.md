# Validation Summary: How to Use Native S3 State Locking Introduced in OpenTofu 1.10

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu 1.10
- AWS S3 (with conditional writes / If-None-Match)
- AWS DynamoDB (legacy locking approach)
- Terraform/OpenTofu HCL backend configuration
- AWS IAM policies

## Sources Consulted
- [Backend Type: s3 | OpenTofu](https://opentofu.org/docs/language/settings/backends/s3/) — official OpenTofu S3 backend documentation, including `use_lockfile` configuration.
- [OpenTofu RFC: S3 locking with conditional writes (20250211)](https://github.com/opentofu/opentofu/blob/main/rfc/20250211-s3-locking-with-conditional-writes.md) — design RFC describing the `use_lockfile` semantics and migration strategy.
- [Help us test OpenTofu 1.10.0-alpha1 / beta1 announcements](https://opentofu.org/blog/help-us-test-opentofu-1-10-0-alpha1/) — confirms `use_lockfile` shipped in OpenTofu 1.10.
- [State Locking | OpenTofu](https://opentofu.org/docs/language/state/locking/) — general state locking semantics.
- [opentofu/opentofu#2970 — `.tflock` PutObject SSE header issue](https://github.com/opentofu/opentofu/issues/2970) — confirms lock file uses the `.tflock` suffix.

## Issues Found
No technical issues found. All key claims verified:
- `use_lockfile = true` is the correct backend attribute introduced in OpenTofu 1.10.
- The lock file is stored next to the state object with a `.tflock` suffix (e.g., `s3://bucket/key.tflock`), matching the post's "How Native Locking Works" diagram.
- The atomicity guarantee comes from S3 conditional writes (`If-None-Match: *`), which is correctly described.
- The IAM action set (`s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`) is sufficient for the lock-file lifecycle (acquire via conditional PUT, read for status, delete to release) on top of normal state read/write.
- The HCL examples are syntactically correct (S3 bucket, versioning, SSE-KMS, public access block resources are all valid AWS provider resource types and arguments).
- `tofu init -reconfigure` is the correct command for swapping backend configuration.
- The `terraform { backend "s3" {} }` block name is supported by OpenTofu (OpenTofu accepts both `terraform` and `tofu` block names).

## Review Notes
- The OpenTofu RFC actually recommends a transitional "baking period" where both `use_lockfile = true` and `dynamodb_table` are configured simultaneously, allowing OpenTofu to acquire locks in both locations before the DynamoDB table is removed. The post's migration steps go straight from DynamoDB-only to S3-only, which works but is more abrupt than the RFC's recommendation. This isn't incorrect — it's a simpler path that's fine for low-coordination environments — but teams running many concurrent applies across an org may want the dual-lock baking period for safety. Not flagged as an error since the post's approach is valid.
- The "How Native Locking Works" code fence is tagged `hcl` but contains prose rather than HCL. Stylistic only; not a technical issue.
- The IAM policy example uses the bucket name `my-tofu-state` literally, but the bucket-creation example earlier suffixes the account ID (`my-tofu-state-${account_id}`). Readers will need to keep the resource ARN in sync with whatever bucket name they actually use; this is normal copy-paste hygiene rather than a defect.
- OpenTofu also supports a `lock_tags` backend attribute for tagging the lock object (useful for S3 lifecycle rules to clean up old lock-file versions on a versioning-enabled bucket). Not required for correctness, but worth knowing for the bucket-versioning section.
