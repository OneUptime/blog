# Validation Summary: How to Force Unlock a Stuck State Lock in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform-compatible state locking
- AWS S3 backend with DynamoDB locking
- AWS CLI (`aws dynamodb`)
- HCL backend configuration

## Sources Consulted
- OpenTofu CLI docs: `tofu force-unlock` command — https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu S3 backend docs — https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu source for the local state lock info file naming convention (`internal/states/statemgr/filesystem.go`) — https://github.com/opentofu/opentofu
- AWS DynamoDB CLI reference (`scan`, `delete-item`) — https://docs.aws.amazon.com/cli/latest/reference/dynamodb/
- HashiCorp Terraform `LockInfo` struct (used by OpenTofu, since OpenTofu was forked from Terraform) for JSON shape verification

## Issues Found
- **Local lock file name missing leading dot.** The post correctly stated on the introductory line that the lock info file is `.terraform.tfstate.lock.info`, but the subsequent `rm` and `cat` commands referenced `terraform.tfstate.lock.info` (no leading dot). OpenTofu's local backend constructs the lock info path as `.{state_name}.lock.info`, so the file actually written to disk is `.terraform.tfstate.lock.info`. Updated both commands in the "Local Backend Locks" section to use the correct dotted filename so the commands actually work.

## Review Notes
- The `tofu force-unlock` command, the `-force` flag (skip confirmation), and the confirmation prompt text are accurate per current OpenTofu CLI behavior.
- The example error message format (`ConditionalCheckFailedException`, `OperationTypeApply`, `Lock Info` block) matches the real output produced by the S3+DynamoDB backend.
- The DynamoDB `LockID` value `<bucket>/<key>` is the correct primary-key format used by the S3 backend's lock entry.
- The JSON shape of the lock info file matches OpenTofu's `LockInfo` struct (`ID`, `Operation`, `Info`, `Who`, `Version`, `Created`, `Path`).
- Using the `terraform { backend "s3" {...} }` block with OpenTofu is still supported (OpenTofu accepts both `terraform` and `tofu` top-level blocks for backend configuration), so this example remains valid.
- Version-specific caveat (not changed in the post, since it's not strictly wrong): as of OpenTofu 1.10, the S3 backend supports native S3-based locking via `use_lockfile = true`, removing the need for a separate DynamoDB table. The post's DynamoDB-based approach is still valid and widely deployed, but readers on newer OpenTofu may prefer the native option.
- The example version string `1.8.0` in the lock info is just illustrative; left unchanged.
