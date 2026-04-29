# Validation Summary: How to List All Workspaces in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu workspaces
- OpenTofu backends (`local`, `s3`, `gcs`)
- Bash shell scripting
- AWS CLI (`aws s3 ls`)
- Google Cloud Storage CLI (`gsutil`)

## Sources Consulted
- OpenTofu docs: Command: workspace list - https://opentofu.org/docs/cli/commands/workspace/list/
- OpenTofu docs: Command: workspace new - https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu docs: Command: workspace show - https://opentofu.org/docs/cli/commands/workspace/show/
- OpenTofu docs: Managing Workspaces - https://opentofu.org/docs/cli/workspaces/
- OpenTofu docs: Workspaces - https://opentofu.org/docs/language/state/workspaces/
- OpenTofu docs: Backend Type: local - https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu docs: Backend Type: s3 - https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu docs: Backend Type: gcs - https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu source: `internal/backend/local/backend.go` - https://github.com/opentofu/opentofu/blob/main/internal/backend/local/backend.go
- OpenTofu source: `internal/backend/remote-state/s3/backend_state.go` - https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/s3/backend_state.go
- OpenTofu source: `internal/backend/remote-state/gcs/backend_state.go` - https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/gcs/backend_state.go
- OpenTofu source: `internal/backend/remote/backend.go` - https://github.com/opentofu/opentofu/blob/main/internal/backend/remote/backend.go
- OpenTofu source: `internal/backend/remote-state/consul/backend_state.go` - https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/consul/backend_state.go
- OpenTofu source: `internal/command/views/workspace.go` - https://github.com/opentofu/opentofu/blob/main/internal/command/views/workspace.go

## Issues Found
- The post said `tofu workspace list` shows all workspaces without qualification. I updated the introduction to clarify this applies when the backend supports multiple workspaces, matching the OpenTofu workspace documentation.
- The post claimed workspaces are listed alphabetically. That is not true for all backends. I changed this to say `default` is always present and the remaining order depends on the backend.
- The "After Creating Workspaces" example showed `staging` as active after running `tofu workspace new production`. That command creates and switches to the new workspace, so I corrected the example to show `production` as active.
- The `grep` examples matched substrings rather than exact workspace names. I updated them to strip the current-workspace marker and use exact fixed-string matching with `grep -Fqx` / `grep -Fvx`.
- The workspace count example used `wc -l` directly on human-readable output. I changed it to count non-empty normalized lines so it reflects the actual number of workspaces.
- The local backend example claimed to list state files but actually listed only directories. I changed it to list `terraform.tfstate` files for non-default local workspaces.
- The S3 backend example was too broad about where workspace state lives. I clarified that the shown `workspace_key_prefix` listing is for non-default workspaces and that the default workspace remains at the configured key.
- The GCS example assumed a prefix but did not state that assumption and showed truncated object paths. I clarified the prefix assumption and corrected the example output format.
- The local backend audit command used GNU `find -printf`, which is not portable. I replaced it with a portable `find ... -print` form and expanded it to include both default and non-default local state files.
- The S3 audit example filtered on `terraform.tfstate`, which is not a general requirement for S3 backend keys. I removed that filter so the example remains correct regardless of the configured key name.

## Review Notes
- Official OpenTofu docs note that only some backends support multiple workspaces. The post now reflects that constraint.
