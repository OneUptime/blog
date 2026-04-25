# Validation Summary: How to Use Plugin Cache Directory in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider plugin cache
- OpenTofu CLI configuration
- Shell commands

## Sources Consulted
- OpenTofu CLI Configuration File docs: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Environment Variables docs: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu Managing Plugins docs: https://opentofu.org/docs/v1.9/cli/plugins/
- OpenTofu source: `internal/providercache/dir.go`: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/providercache/dir.go
- OpenTofu source: `internal/getproviders/filesystem_search.go`: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/getproviders/filesystem_search.go
- OpenTofu source: `internal/command/views/init.go`: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/command/views/init.go

## Issues Found
- The post used legacy Terraform CLI config filenames (`.terraformrc` and `terraform.rc`) instead of current OpenTofu filenames (`.tofurc` and `tofu.rc`). I updated the examples to match current OpenTofu documentation.
- The CLI config example defined `plugin_cache_dir` twice in the same HCL block, which would make the snippet invalid if copied verbatim. I kept one active example and turned the alternate `$HOME` form into a commented alternative.
- The introduction said OpenTofu symlinks from the cache instead of re-downloading as a general rule. I corrected this to reflect current behavior: OpenTofu uses the cached package when available and creates symlinks only when possible.
- The `plugin_cache_may_break_dependency_lock_file` section incorrectly said the flag allows cache use when checksums differ from the lock file. I corrected it to match the docs: it allows use of cached providers when the current configuration does not yet have a matching checksum entry in `.terraform.lock.hcl`.
- The stale-cache troubleshooting example removed a version directory without the platform segment and referenced a non-current error phrase. I updated the example to target the concrete platform-specific cache path and adjusted the wording to match OpenTofu’s shared-cache terminology.
- The cache verification example looked for output strings that do not match current OpenTofu messages. I updated the grep pattern and example messages to reflect the current human-readable init output.
- The conclusion implied that pre-populating the plugin cache alone is sufficient for air-gapped environments. I corrected this to note that a provider mirror is the proper mechanism for air-gapped installation, with cache prepopulation only as an optional addition.

## Review Notes
- The cache directory path examples continue to use `.terraform.d/plugin-cache`, which is still what current OpenTofu documentation uses for example paths.
- The post’s example cache layout is consistent with the current OpenTofu source code, which stores cached providers using hostname, namespace, type, version, and platform path segments.
