# Validation Summary: How to Use OpenTofu with Existing Terraform Modules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- Terraform modules
- OpenTofu and Terraform module registries
- Git-sourced modules
- Local modules
- Private module registries
- OpenTofu CLI configuration
- Provider version constraints and dependency lock files

## Sources Consulted
- OpenTofu Module Sources: https://opentofu.org/docs/language/modules/sources/
- OpenTofu Module Blocks: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu Module Registry Protocol: https://opentofu.org/docs/internals/module-registry-protocol/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu Provider Network Mirror Protocol: https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- Terraform Module Sources: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform CLI Configuration File: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform Dependency Lock File: https://developer.hashicorp.com/terraform/language/files/dependency-lock

## Issues Found
- The post claimed OpenTofu is fully compatible with Terraform modules and that any Terraform module will work with OpenTofu. Changed this to "broadly compatible" and scoped compatibility to Terraform 1.6-era language features and compatible provider plugins.
- The registry module section described public Terraform Registry modules as working directly through a mirrored registry. Updated it to say that many public modules originally published for Terraform are available through the OpenTofu Registry, and that OpenTofu resolves shorthand registry sources through `registry.opentofu.org`.
- The Git module section said Git-sourced modules have zero compatibility concerns. Clarified that the Git source address is compatible, but the module code must still use OpenTofu-supported language features and provider versions.
- The private registry credentials example recommended `~/.terraformrc` as the primary OpenTofu CLI config file. Updated it to use `~/.tofurc` and noted that `~/.terraformrc` is supported for backward compatibility when no OpenTofu-specific config file is present.
- The Artifactory/private registry section used `provider_installation` and `network_mirror` for module registry access. Replaced it with a `credentials` block because provider installation mirrors configure provider downloads, not module registry authentication.
- The `required_version` section said OpenTofu maps Terraform version constraints to its own version and that OpenTofu 1.6.0 reports Terraform compatibility. Updated this to explain that `required_version` is evaluated against the OpenTofu CLI version while the `terraform` block name remains for compatibility.
- The feature compatibility section cited specific import block behavior as an example without a precise version caveat. Generalized it to Terraform-specific language features added after the fork.
- The module version management section incorrectly said lock files ensure reproducible module downloads and that module versions are tracked in `.terraform/modules/modules.json`. Updated it to state that `.terraform.lock.hcl` tracks providers only, remote module selections are not recorded in the lock file, and exact registry module versions should be used for reproducible module selection.

## Review Notes
The main examples use valid module block syntax and source address patterns documented by OpenTofu and Terraform. The local environment did not have `tofu` or `terraform` installed, so CLI behavior was verified against official documentation rather than local command output.
