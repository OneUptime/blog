# Validation Summary: How to Cache Providers Locally for Faster Initialization

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- HCL CLI configuration
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Environment Variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `tofu providers lock`: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu `tofu providers mirror`: https://opentofu.org/docs/cli/commands/providers/mirror/
- GitHub Actions dependency caching reference: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitHub Actions workflow syntax (`env`): https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI/CD caching: https://docs.gitlab.com/ci/caching/
- GitLab CI/CD variables: https://docs.gitlab.com/ci/variables/where_variables_can_be_used/

## Issues Found
- The post used `~/.terraformrc` as the main OpenTofu CLI config example. I updated it to `~/.tofurc`, which is the preferred OpenTofu config filename on non-Windows systems.
- The "How the Cache Works" section implied that OpenTofu checks the cache before resolving provider installation metadata. I corrected it to match the documented flow: OpenTofu resolves the provider package first, then checks the cache for that selected package.
- The GitHub Actions example wrote to `~/.terraformrc` and also set `TF_PLUGIN_CACHE_DIR: ~/.terraform.d/plugin-cache` in step YAML. I updated the example to use `~/.tofurc` and rely on the documented persistent CLI configuration approach.
- The pre-population section incorrectly described `tofu providers lock` as pre-downloading providers and also treated the plugin cache as the air-gapped solution. I changed it so `tofu providers lock` is described only as adding platform checksums, added the required `mkdir -p /shared/tofu-cache`, and limited the example to populating a cache from a connected environment.
- The introduction, description, and conclusion used absolute wording about "every `tofu init`" and eliminating downloads entirely. I narrowed those claims to fresh working directories and repeated downloads, which is technically accurate.

## Review Notes
- `.terraformrc` is still supported by OpenTofu for backward compatibility, but `.tofurc` is the preferred filename for current OpenTofu documentation.
- For truly air-gapped environments, OpenTofu documents `tofu providers mirror` as the proper mechanism; a plugin cache is primarily for reusing already-downloaded providers.
- OpenTofu does not create the plugin cache directory automatically; the directory must exist before caching is used.
