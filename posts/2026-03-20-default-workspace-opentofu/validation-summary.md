# Validation Summary: How to Understand the Default Workspace in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu (workspaces)
- Terraform (compatibility / `terraform.workspace`)
- S3 backend (state storage)
- Local backend (state storage)
- HCL (resource and locals blocks, `lookup` function)
- AWS provider (`aws_instance`, `null_resource`)

## Sources Consulted
- OpenTofu Workspaces documentation: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu S3 Backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Local Backend documentation: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu `lookup` function documentation: https://opentofu.org/docs/language/functions/lookup/

## Issues Found
No technical issues found.

All technical claims were verified against the official OpenTofu documentation:
- The default workspace is named `default` and cannot be deleted.
- The S3 backend stores the default workspace state at the bare `key` path, while named workspaces are stored at `<workspace_key_prefix>/<workspace_name>/<key>`, with `workspace_key_prefix` defaulting to `env:`.
- The local backend stores the default workspace state at `terraform.tfstate` and named workspaces under `terraform.tfstate.d/<workspace_name>/terraform.tfstate`.
- `terraform.workspace` returns the current workspace name (`"default"` in the default workspace) and is the documented interpolation in OpenTofu.
- CLI commands (`tofu workspace list`, `tofu workspace show`, `tofu workspace new`, `tofu workspace select`) are correct.
- The `lookup(map, key, default)` syntax is correct and supports a default-value third argument.
- The `null_resource` + `local-exec` provisioner example uses valid HCL syntax.

## Review Notes
- `null_resource` is provided by the `hashicorp/null` provider (which works under OpenTofu). Authors writing new examples may also consider `terraform_data` as a more modern equivalent that ships built-in, though `null_resource` is still valid.
- The post correctly notes the practical risk of using `terraform.workspace` in unique-resource names when the workspace value is `"default"`. This is a useful caveat that aligns with the official guidance recommending workspaces only for similar (non-isolated) environments.
