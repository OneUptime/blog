# Validation Summary: How to Debug OpenTofu Configuration Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (concepts shared with OpenTofu)
- HCL configuration language
- AWS provider (`hashicorp/aws`)
- AzureRM provider (`hashicorp/azurerm`)
- Graphviz `dot` (for dependency graph visualization)
- Python 3 (state file inspection snippet)
- Bash scripting

## Sources Consulted
- OpenTofu CLI – `tofu output`: https://opentofu.org/docs/cli/commands/output/
- Terraform CLI – `terraform output`: https://developer.hashicorp.com/terraform/cli/commands/output
- OpenTofu Debugging / Logging internals: https://opentofu.org/docs/internals/debugging/
- Terraform Debugging / Logging internals: https://developer.hashicorp.com/terraform/internals/debugging
- OpenTofu module sources: https://opentofu.org/docs/language/modules/sources/
- Terraform module sources: https://developer.hashicorp.com/terraform/language/modules/sources
- AWS provider authentication: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform `formatdate` function: https://developer.hashicorp.com/terraform/language/functions/formatdate
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Historical context for removal of `-module` flag: https://github.com/hashicorp/terraform/issues/21799

## Issues Found

1. **`tofu output -module=networking` is not a valid command.** The `-module` flag was removed from `terraform output` in Terraform 0.12 and is not present in OpenTofu. Replaced with `tofu state list | grep '^module.networking'`, which is a working way to inspect module-scoped resources. The canonical way to expose module outputs is via root-level `output` blocks referencing `module.<name>.<output>`.

2. **"Use absolute source paths for local modules" comment was incorrect** and contradicted the example beneath it. Per the OpenTofu/Terraform docs, local module sources must be **relative** paths starting with `./` or `../`; absolute paths are not treated as local modules and are explicitly discouraged. Updated the comment to "Local module sources must be relative paths (./ or ../)".

3. **AWS provider credential chain order was slightly inaccurate.** The post listed "EC2 instance profile / ECS task role" combined as one step and omitted the shared configuration file (`~/.aws/config`) as a distinct source. Per the `hashicorp/aws` provider docs, the documented order is: provider config → environment variables → shared credentials file → shared configuration file → container credentials (ECS) → EC2 instance profile (IMDS). Updated to reflect the documented order. Also dropped the "Web identity token (for OIDC/SSO)" line since web-identity assumption is not a discrete step in the chain (it is a credential source surfaced through env vars or assume-role configuration).

## Review Notes

- `TF_LOG`, `TF_LOG_CORE`, `TF_LOG_PROVIDER`, and `TF_LOG_PATH` are all valid OpenTofu environment variables. Levels `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR` are all valid.
- The `cidrsubnet("10.0.0.0/16", 8, 1)` example correctly evaluates to `"10.0.1.0/24"`.
- The `formatdate("YYYY-MM-DD", timestamp())` example uses correct format specifiers.
- The `for_each` error message text matches the actual OpenTofu/Terraform error wording.
- The `tofu providers lock` command is valid (generates/updates `.terraform.lock.hcl` entries).
- The Python state-inspection snippet uses correct JSON state file fields (`version`, `serial`, `resources`).
- The AMI ID used in the `aws_instance` example (`ami-0c55b159cbfafe1f0`) is illustrative; readers running these examples in real environments should substitute a current AMI ID for their target region.
- The `azurerm` provider 3.85.0 version constraint is a real, released version; readers planning new work may want to consider the v4.x line, but pinning to 3.85.0 is a legitimate stability choice.
