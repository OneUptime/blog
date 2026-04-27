# Validation Summary: How to Understand When Not to Use Workspaces in OpenTofu

## Status
validated

## Post Type
Guide / Opinion piece on architectural trade-offs

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform (referenced for compatibility)
- HCL (HashiCorp Configuration Language)
- S3 backend for remote state
- AWS provider
- IAM (assume-role via `role_arn` in backend config)

## Sources Consulted
- OpenTofu CLI workspaces documentation: https://opentofu.org/docs/cli/workspaces/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu language `terraform.workspace` reference: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu partial backend configuration / `init -backend-config`: https://opentofu.org/docs/language/settings/backends/configuration/#partial-configuration
- HashiCorp Terraform "When to use multiple workspaces" guidance (canonical source for the limitations enumerated): https://developer.hashicorp.com/terraform/language/state/workspaces#when-to-use-multiple-workspaces

## Issues Found
- **Limitation 4 — S3 workspace state path layout was incorrect.** The original diagram showed the non-default workspace state at `prefix/env:/production/`, which interleaves the workspace prefix inside the key. Per the S3 backend spec, non-default workspaces are stored at `<workspace_key_prefix>/<workspace>/<key>` (default `workspace_key_prefix` is `env:`). With `key = "prefix/terraform.tfstate"`, the production workspace state is therefore at `env:/production/prefix/terraform.tfstate`. Updated the diagram to reflect the correct path. The author's underlying point about coupled state in the same backend remains accurate.

## Review Notes
- The use of `terraform.workspace` in HCL is correct under OpenTofu — OpenTofu retains the `terraform.*` namespace for backwards compatibility, so no rename to a `tofu.*` form is needed.
- The CLI examples (`tofu workspace select`, `tofu init -backend-config=...`) match current OpenTofu CLI syntax.
- The partial backend block `terraform { backend "s3" {} }` is a valid OpenTofu construct for use with `-backend-config` flags.
- The thresholds quoted (`~20%` divergence, `>50% different resources`) are heuristics rather than documented numbers; they reflect community guidance and are presented appropriately as opinions.
- The claim that workspaces share backend credentials and provider configuration is accurate — workspaces only switch state files, not provider/auth context.
