# Validation Summary: How to Configure the Local Backend in OpenTofu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Local backend for Terraform-style state files
- HCL backend configuration syntax
- OpenTofu workspaces
- File-based state locking
- S3 remote backend (briefly, in the migration section)

## Sources Consulted
- OpenTofu local backend documentation: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu workspaces documentation: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu source — local backend: https://github.com/opentofu/opentofu/blob/main/internal/backend/local/backend.go (constants `DefaultStateFilename`, `DefaultWorkspaceDir`, `DefaultBackupExtension`, and `StatePaths()`)
- OpenTofu source — filesystem state manager: https://github.com/opentofu/opentofu/blob/main/internal/states/statemgr/filesystem.go (`lockInfoPath()`)

## Issues Found
1. **Incorrect workspace path example with custom `path`** (under "Workspace Behavior with Local Backend"). The post claimed that setting `path = "/var/terraform/states/terraform.tfstate"` would automatically place non-default workspace states under `/var/terraform/states/terraform.tfstate.d/`. This is wrong: per `StatePaths()` and `stateWorkspaceDir()` in `internal/backend/local/backend.go`, `workspace_dir` defaults to `terraform.tfstate.d` resolved relative to the working directory regardless of `path`. To actually get the layout shown, `workspace_dir` must also be set. I rewrote the example to set `workspace_dir` explicitly and added a note that the non-default workspace state file is always named `terraform.tfstate` (the basename of `path` is not reused — confirmed by `StatePaths()` joining `DefaultStateFilename` rather than the configured `path` basename).
2. **Misleading "Workspace-Aware Path Configuration" section.** The original suggested workspaces would "create subdirectories automatically" relative to a custom `path`. Replaced with an accurate explanation that `workspace_dir` is the knob for that, and updated the example to set both `path` and `workspace_dir`.
3. **Internally inconsistent locking claim** (under "When to Use the Local Backend"). The post documented file-based locking via `.terraform.tfstate.lock.info` earlier, then in the avoid-list said the local backend has "no locking with remote backends" — confusing wording, and inaccurate because the local backend does perform OS-level file locking. Reworded to "no versioning; file locking only protects same-machine concurrency", which preserves the author's intent (don't rely on it for distributed teams) without contradicting the locking section.

## Review Notes
- The default state filename, backup filename (`terraform.tfstate.backup`), default workspace directory (`terraform.tfstate.d`), and lock filename pattern (`.<state-basename>.lock.info`) all match the OpenTofu source.
- The S3 backend example in the migration section uses correct argument names (`bucket`, `key`, `region`) and is valid OpenTofu syntax.
- The `tofu init`, `tofu workspace new`, and `tofu force-unlock` commands referenced are correct.
- Author's writing style and section structure preserved; only technically incorrect content was changed.
