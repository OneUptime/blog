# Validation Summary: How to Use Local Path Module Sources in OpenTofu - Path

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (module sources, `tofu init`, `tofu plan`)
- Terraform (compatible HCL module syntax)
- HCL (HashiCorp Configuration Language)
- Infrastructure as Code module patterns (monorepos, environment layouts)

## Sources Consulted
- OpenTofu official documentation — Module sources / Local paths: https://opentofu.org/docs/language/modules/sources/#local-paths
- OpenTofu CLI documentation — `tofu init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu source code — `installLocalModule` in `internal/initwd/module_install.go`: https://github.com/opentofu/opentofu/blob/main/internal/initwd/module_install.go

## Issues Found
- **Incorrect claim about `tofu init` copying local modules.** The "Important Notes" bullet originally read: ``tofu init` copies local module contents into `.terraform/modules/` - re-run it if you rename a module.` This is wrong. Per the OpenTofu docs and source code (`installLocalModule`), local path modules are **not** copied; OpenTofu only records a reference (the on-disk `Dir`) in `.terraform/modules/modules.json` and reads the files in place. Only absolute paths and remote modules are copied/downloaded into the local cache. Updated the bullet to: ``tofu init` records local module references in `.terraform/modules/modules.json` (the files themselves are read in place from disk, not copied) - re-run it if you add, remove, or change a module's `source` address.`

## Review Notes
- The other technical claims are accurate:
  - Local paths must start with `./` or `../`; otherwise OpenTofu treats the source as a registry address. (Confirmed in official docs.)
  - Local modules do not support the `version` argument — version constraints apply only to registry sources. (Confirmed in docs.)
  - Edits to local module files are picked up on the next `plan`/`apply` without re-running `init`, because no copy is made and the original directory is referenced. (Confirmed in source code.)
- HCL syntax in all examples is valid and consistent with OpenTofu/Terraform module block conventions.
- The monorepo directory tree and example `environments/prod/main.tf` configuration are realistic and syntactically correct.
- No version-specific caveats noted; the local path module behavior described is stable across all current OpenTofu releases.
