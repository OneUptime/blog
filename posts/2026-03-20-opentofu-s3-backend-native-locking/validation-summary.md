# Validation Summary: How to Configure S3 Backend with Native State Locking in OpenTofu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTofu (S3 backend, native state locking via `use_lockfile`)
- Terraform (legacy `terraform { backend "s3" }` block syntax)
- AWS S3 (conditional writes, `If-None-Match` header, versioning)
- AWS DynamoDB (legacy state locking, for comparison)
- AWS CLI (`aws s3 ls`, `aws s3 rm`)
- HCL configuration

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu force-unlock command docs: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu v1.10.0 release notes: https://github.com/opentofu/opentofu/releases/tag/v1.10.0
- OpenTofu v1.10 CHANGELOG: https://raw.githubusercontent.com/opentofu/opentofu/v1.10/CHANGELOG.md
- OpenTofu source — S3 client (`internal/backend/remote-state/s3/client.go`)
- OpenTofu source — Lock info struct (`internal/states/statemgr/locker.go`)

## Issues Found
1. **Incorrect version claim — "OpenTofu 1.7+".** Native S3 locking via `use_lockfile = true` was introduced in OpenTofu **1.10.0** (released 2025-06-24), not 1.7+. The 1.7 release predates this feature by years. Updated the comparison-table row, conclusion paragraph, and the example lock file `Version` field (`1.8.0` → `1.10.0`).
2. **Overstated S3 versioning requirement.** The post stated the bucket "must have object versioning enabled for native locking to work reliably." Per the official S3 backend docs, native locking works via S3 conditional writes regardless of versioning; bucket versioning is *highly recommended* for state recovery, not strictly required for locking to function. Softened the wording to "highly recommended" in both the section intro and the conclusion.

## Review Notes
- All other technical claims verified: lock file extension `.tflock`, atomic creation via `If-None-Match: *` conditional writes, lock file JSON schema (ID, Operation, Info, Who, Version, Created, Path), `tofu force-unlock LOCK_ID` syntax, `tofu init -reconfigure` for backend migration, and the HCL backend configuration arguments (`bucket`, `key`, `region`, `encrypt`, `use_lockfile`, `dynamodb_table`).
- The post still uses the `terraform {}` block name rather than `tofu {}`, which is correct — OpenTofu accepts the `terraform` block for compatibility, and most users continue to use it.
- The DynamoDB locking option (`dynamodb_table`) referenced in the comparison and migration sections is still supported by OpenTofu, so the migration scenario remains valid.
