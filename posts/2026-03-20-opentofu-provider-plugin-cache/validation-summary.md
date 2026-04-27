# Validation Summary: How to Use the Provider Plugin Cache in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (CLI configuration, provider plugin cache)
- Terraform (compatibility — `TF_PLUGIN_CACHE_DIR` environment variable)
- HCL (`.tofurc` configuration file format)
- GitHub Actions (`actions/cache@v4`)
- AWS provider (`hashicorp/aws` 5.31.0 used as example)

## Sources Consulted
- OpenTofu CLI Configuration File documentation: https://opentofu.org/docs/cli/config/config-file/
- HashiCorp Help Center reference confirming AWS provider binary naming with `_x5` suffix: https://support.hashicorp.com/hc/en-us/articles/25111858689939
- hashicorp/terraform-provider-aws release pages and CHANGELOG: https://github.com/hashicorp/terraform-provider-aws

## Issues Found
No technical issues found.

Verified specifically:
- `.tofurc` is the correct CLI config filename on Unix-like systems (Windows uses `tofu.rc`).
- `plugin_cache_dir` is the correct setting name.
- Environment variable substitution (e.g., `$HOME`) is supported in path values within `.tofurc`.
- `TF_PLUGIN_CACHE_DIR` is the correct environment variable (OpenTofu maintains compatibility with the Terraform variable name).
- Default provider download location is `.terraform/providers/`.
- OpenTofu uses symbolic links from `.terraform/providers/` to the cache when possible, matching the documented behavior.
- Default registry is `registry.opentofu.org`, and the cache directory layout (`HOSTNAME/NAMESPACE/TYPE/VERSION/TARGET`) follows the documented unpacked filesystem mirror format.
- The provider binary name `terraform-provider-aws_v5.31.0_x5` follows the actual naming convention used by the AWS provider 5.x release artifacts.
- `actions/cache@v4` is a current, valid GitHub Action version.
- The `echo 'plugin_cache_dir = "$HOME/..."' > ~/.tofurc` line in the CI snippet correctly uses single quotes so the literal `$HOME` is written to the file and expanded by OpenTofu's path substitution at runtime.

## Review Notes
- The `_x5` suffix in the AWS provider binary name reflects the legacy plugin protocol naming convention that HashiCorp still uses for its provider builds. Other providers (especially newer ones) may not use this suffix, so readers should not assume the suffix universally.
- The post does not mention the well-known caveat that, when a provider is installed only from the cache, OpenTofu may not be able to verify it against the dependency lock file's checksums in the same way as a fresh download. Users who care about strict lock-file enforcement may want to consult the official docs on the cache and lock-file interaction. This is an addition opportunity, not an inaccuracy.
- The example uses `~/.terraform.d/plugin-cache` (the historical Terraform path). OpenTofu does not require this exact location — any user-writable directory works — but it remains a reasonable default for users migrating from Terraform.
