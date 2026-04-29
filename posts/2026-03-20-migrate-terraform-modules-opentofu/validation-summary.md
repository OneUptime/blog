# Validation Summary: How to Migrate Terraform Modules to OpenTofu

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- OpenTofu (CLI: `tofu`, versions 1.8 / 1.9 / 1.11)
- Terraform (HCL syntax, registry, lock file)
- Terraform / OpenTofu module ecosystem (registry, Git-based, local)
- Terratest (Go testing framework)
- AWS provider (`aws_db_instance`, write-only attributes)

## Sources Consulted
- [What's new in OpenTofu 1.8?](https://opentofu.org/docs/v1.8/intro/whats-new/)
- [OpenTofu 1.9.0 is available now with provider for_each](https://opentofu.org/blog/opentofu-1-9-0/)
- [What's new in OpenTofu 1.11?](https://opentofu.org/docs/intro/whats-new/)
- [Write-only attributes | OpenTofu](https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/)
- [Ephemeral Support in OpenTofu](https://opentofu.org/blog/ephemeral-ready-for-testing/)
- [Module Registry Protocol | OpenTofu](https://opentofu.org/docs/internals/module-registry-protocol/)
- [Use temporary write-only arguments | Terraform Developer](https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only)
- [aws_db_instance | hashicorp/aws | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)

## Issues Found

1. **Wrong OpenTofu version for provider `for_each`.** The post claimed provider iteration was introduced in OpenTofu 1.8. It was actually introduced in OpenTofu 1.9 (1.8 added early variable evaluation, provider mocks, and the `.tofu` file extension). Updated the comment and section blurb to "OpenTofu 1.9+".

2. **Wrong OpenTofu version for write-only attributes.** The post claimed write-only attributes shipped in OpenTofu 1.10. They were not in 1.10 — all components were merged in time for OpenTofu 1.11. Updated to "OpenTofu 1.11+".

3. **Incorrect write-only attribute example.** The original snippet wrote `password = var.db_password` with a comment "`write_only = true` means value never stored in state." There is no `write_only = true` flag — write-only is a *provider-defined attribute* with a `_wo` suffix (and a paired `_wo_version` field for triggering updates). The standard `password` argument is *not* write-only and would still be stored in state. Replaced with the correct `password_wo` / `password_wo_version` pattern as documented for `aws_db_instance`.

4. **Mismatched comment vs example for deprecated syntax.** The header `# DEPRECATED: list() and map() functions` was followed by an example that did not show the `list()`/`map()` functions at all — it showed interpolation inside a list literal. Reworded the comment to match the actual example: "Interpolation inside list literals."

## Review Notes
- The OpenTofu module registry (registry.opentofu.org) does mirror modules from the Terraform registry, so the post's claim about registry compatibility is accurate.
- The `password_wo` mechanism is most useful when paired with an ephemeral resource (e.g. `ephemeral.random_password.db_password.result`) so the secret is never materialised on disk; the post still uses `var.db_password` which is acceptable for an introductory example but worth highlighting in a follow-up.
- Step 6's requirements table example uses `opentofu | >= 1.8` as a generic minimum — if a module relies on the features in Step 4 (provider `for_each` or write-only attributes), the minimum should be raised to 1.9 or 1.11 respectively. This is left as-is because Step 6 is presented as a general template.
- The Terratest `TerraformBinary: "tofu"` field is correct (added in Terratest module v0.46.x).
