# Validation Summary: How to Use OpenTofu Registry for Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu Registry
- Terraform-compatible provider configuration
- HCL
- Provider mirrors
- Provider dependency lock files
- Provider plugin caching

## Sources Consulted
- OpenTofu Providers documentation: https://opentofu.org/docs/language/providers/
- OpenTofu Provider Requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Version Constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu Dependency Lock File documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu CLI Configuration File documentation: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu `tofu providers mirror` command documentation: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu Provider Registry Protocol documentation: https://opentofu.org/docs/internals/provider-registry-protocol/
- OpenTofu Registry page: https://opentofu.org/registry/
- OpenTofu Registry provider API checks for example providers under https://registry.opentofu.org/v1/providers/

## Issues Found
- The post described the registry as browsable at `registry.opentofu.org`. The public registry protocol host is correct, but OpenTofu's current registry page directs users to the searchable catalogue at `https://search.opentofu.org/`. Updated the explanatory text and browsing comment to point users to the catalogue URL.
- The post claimed the OpenTofu Registry mirrors most providers available in the Terraform ecosystem. Official documentation says the Public OpenTofu Registry hosts providers for most major infrastructure platforms, so the broader mirroring claim was softened to "includes many providers from the Terraform ecosystem."
- The provider cache example used only `TF_PLUGIN_CACHE_DIR` as a persistent shell-profile setting. Official documentation supports that environment variable, but recommends `plugin_cache_dir` in the CLI configuration file for persistent configuration. Updated the example to use `plugin_cache_dir` and kept the required cache directory creation command.

## Review Notes
The OpenTofu CLI was not installed in the local workspace, so CLI behavior was verified against current official OpenTofu documentation and registry API responses rather than local `tofu --help` output. The HCL snippets, provider source address format, version constraint examples, lock file behavior, mirror configuration structure, and development override examples are consistent with the official documentation reviewed.
