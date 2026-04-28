# Validation Summary: How to Use tofu force-unlock to Release State Locks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu force-unlock` command)
- Terraform state locking concepts
- AWS S3 backend (with DynamoDB locking and S3 native locking)
- AWS DynamoDB (lock table)
- Azure Blob Storage backend
- PostgreSQL backend (advisory locks)
- AWS CLI (`aws s3 ls`, `aws dynamodb get-item`)
- `jq`

## Sources Consulted
- OpenTofu `force-unlock` CLI documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu source — `internal/command/unlock.go` (confirmation prompt text and flag handling)
- OpenTofu source — `internal/command/views/unlock.go` (success message text in `UnlockHuman.ForceUnlockSucceeded`)
- OpenTofu source — `internal/command/clistate/state.go` (state lock error format)
- OpenTofu source — `internal/backend/remote-state/s3/client.go` (S3 native lock file naming with `.tflock` suffix)
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found
1. **Outdated confirmation prompt text.** The post showed `Terraform will remove the lock on the remote state.` and only the truncated `Only 'yes' will be accepted to confirm.` line. OpenTofu's `internal/command/unlock.go` uses the message `OpenTofu will remove the lock on the remote state.\nThis will allow local OpenTofu commands to modify this state, even though it\nmay still be in use. Only 'yes' will be accepted to confirm.`. Updated the example to match OpenTofu's actual wording.
2. **Incorrect success message.** The post claimed the output is `Lock "<id>" has been successfully unlocked!`, which is not what OpenTofu emits. `internal/command/views/unlock.go`'s `UnlockHuman.ForceUnlockSucceeded` prints `OpenTofu state has been successfully unlocked!` followed by `The state has been unlocked, and OpenTofu commands should now be able to obtain a new lock on the remote state.`. Replaced the incorrect line with OpenTofu's actual output.

## Review Notes
- The `-force` flag is verified to bypass the confirmation prompt (per OpenTofu CLI help).
- The S3 native locking lock object name (`<state-key>.tflock`) is correct — confirmed by `lockFileSuffix = ".tflock"` in `internal/backend/remote-state/s3/client.go`.
- The "S3 backend: check for a lock file" hint via `aws s3 ls` is only meaningful with S3 native locking (`use_lockfile=true`); with the legacy S3 + DynamoDB combo, no `.tflock` object is created. The post's separation between S3 and DynamoDB sections covers both, so this is not technically wrong, just a simplification.
- The post does not name a specific OpenTofu version; the example error message references `Version: 1.6.0`, which is plausible but illustrative only. The behavior described matches current OpenTofu (1.10+) where S3 native locking was introduced.
