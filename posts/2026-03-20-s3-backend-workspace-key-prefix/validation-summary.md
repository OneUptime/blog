# Validation Summary: How to Configure S3 Backend with workspace_key_prefix in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu S3 backend
- OpenTofu CLI workspaces
- AWS S3
- AWS CLI
- DynamoDB state locking
- HCL backend configuration

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu workspace management documentation: https://opentofu.org/docs/cli/workspaces/
- OpenTofu `workspace new` command documentation: https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu `workspace list` command documentation: https://opentofu.org/docs/cli/commands/workspace/list/
- OpenTofu `workspace select` command documentation: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu S3 backend source implementation: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/backend/remote-state/s3/backend.go
- OpenTofu S3 backend workspace path implementation: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/backend/remote-state/s3/backend_state.go
- AWS CLI `s3 ls` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- AWS CLI `s3 mv` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/mv.html

## Issues Found
No technical issues found.

## Review Notes
The post's path examples match OpenTofu's documented S3 backend behavior: the default workspace uses the configured `key`, while non-default workspaces use `workspace_key_prefix/workspace_name/key`, with `env:` as the default prefix. The empty `workspace_key_prefix` example was also checked against OpenTofu's source implementation and is valid. Current OpenTofu documentation supports both DynamoDB locking via `dynamodb_table` and S3-native locking via `use_lockfile`; DynamoDB locking is not deprecated in OpenTofu.
