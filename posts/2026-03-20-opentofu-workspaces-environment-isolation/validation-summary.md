# Validation Summary: How to Use Workspaces for Environment Isolation in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (workspaces, CLI, state management)
- Terraform-compatible HCL configuration language
- AWS provider (`aws_instance`, `aws_cloudwatch_metric_alarm`)
- S3 backend for remote state
- `null_resource` with `lifecycle.precondition`
- GitHub Actions (CI/CD)

## Sources Consulted
- OpenTofu S3 backend documentation (https://opentofu.org/docs/language/settings/backends/s3/) — `key` and `workspace_key_prefix` semantics
- OpenTofu workspaces CLI documentation (https://opentofu.org/docs/cli/workspaces/) — `tofu workspace new` / `select` / `-or-create` flag
- OpenTofu custom conditions / lifecycle preconditions documentation — `lifecycle { precondition { ... } }` syntax
- OpenTofu language `terraform.workspace` named value (retained for compatibility)
- HashiCorp `null_resource` provider reference

## Issues Found

1. **Incorrect S3 backend workspace path layout.** The original "Separate State per Environment in S3" diagram showed workspace state files at `infrastructure/env:/<workspace>/terraform.tfstate`. According to the official S3 backend docs, when using a non-default workspace the path is `<workspace_key_prefix>/<workspace_name>/<key>` — i.e. the prefix and workspace name come *before* the key, not after. With `key = "infrastructure/terraform.tfstate"` and the default `workspace_key_prefix = "env:"`, the development state path is `env:/development/infrastructure/terraform.tfstate`. Updated the diagram to reflect the correct ordering.

## Review Notes

- `terraform.workspace` is the correct expression in OpenTofu; there is no `tofu.workspace` replacement, and the `terraform.*` named values are retained for compatibility.
- `tofu workspace select -or-create` is valid (the `-or-create` flag is documented).
- `lifecycle { precondition { ... } }` is valid on `null_resource` — preconditions are a generic resource feature available since Terraform 1.2 / OpenTofu 1.6+.
- The `null_resource` workspace-validation pattern still works, but newer OpenTofu code can also use top-level `check` blocks for assertions that should not be tied to a specific resource lifecycle.
- The default workspace cannot be deleted and is not subject to the `workspace_key_prefix`; that is correctly reflected in the (now fixed) diagram.
