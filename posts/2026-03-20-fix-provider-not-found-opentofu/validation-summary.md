# Validation Summary: How to Fix 'Error: Provider Not Found' in OpenTofu

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider installation
- OpenTofu dependency lock files
- OpenTofu CLI configuration
- HCL provider configuration

## Sources Consulted
- OpenTofu docs: Initializing Working Directories - https://opentofu.org/docs/cli/init/
- OpenTofu docs: Provider Requirements - https://opentofu.org/docs/language/providers/requirements/
- OpenTofu docs: CLI Configuration File - https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu docs: Environment Variables - https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu docs: Dependency Lock File - https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu docs: Provider Registry Protocol - https://opentofu.org/docs/v1.9/internals/provider-registry-protocol/

## Issues Found
- The error-output block was marked as `hcl` even though it contains plain CLI error text. I changed the fence to `text` so the snippet type is accurate.
- The `Fix 1` cleanup command deleted `.terraform.lock.hcl` together with `.terraform`. OpenTofu documents the lock file as a configuration artifact that should be committed, so I changed the cleanup step to remove only the generated `.terraform` directory.
- The registry connectivity check used `curl -I`, but the provider registry protocol documents a `GET` request for the versions endpoint. I changed it to `curl -sSf ... >/dev/null` so the example tests the documented endpoint correctly.
- The mirror example wrote to `~/.terraformrc`. OpenTofu's current CLI config file on Unix-like systems is `~/.tofurc`, so I updated the example to the OpenTofu-native path.
- The `Fix 4` explanation said OpenTofu may fail to download an undeclared provider. Per the provider requirements docs, OpenTofu falls back to an implied `hashicorp/<LOCAL NAME>` source address, so I corrected the explanation to describe the real failure mode.
- The fresh plugin-cache example set `TF_PLUGIN_CACHE_DIR` to a new path without creating the directory first. OpenTofu requires the cache directory to already exist, so I added `mkdir -p /tmp/tofu-cache`.
- The lock-file section said the lock file could reference a provider "built for a different platform." The lock file stores provider selections and checksums, not a direct platform pin in the way described, so I rewrote that sentence to focus on mismatched selected versions or recorded checksums.

## Review Notes
- If a team installs providers through a filesystem or network mirror across multiple platforms, `tofu providers lock -platform=...` can be useful to pre-populate checksums for each target platform. The post is still technically correct without covering that workflow.
