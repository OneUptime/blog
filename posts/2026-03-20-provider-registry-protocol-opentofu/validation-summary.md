# Validation Summary: How the OpenTofu Provider Registry Protocol Works

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- OpenTofu CLI
- OpenTofu Provider Registry Protocol
- OpenTofu Provider Network Mirror Protocol
- OpenTofu CLI configuration (`provider_installation`)
- Filesystem and network provider mirrors
- Dependency lock files (`.terraform.lock.hcl`)

## Sources Consulted
- OpenTofu Provider Registry Protocol: https://opentofu.org/docs/internals/provider-registry-protocol/
- OpenTofu Provider Network Mirror Protocol: https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu Remote Service Discovery: https://opentofu.org/docs/internals/remote-service-discovery/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Command: providers mirror: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu Command: providers lock: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu Command: init: https://opentofu.org/docs/cli/init/ and https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- Live OpenTofu registry service discovery document: https://registry.opentofu.org/.well-known/terraform.json
- Live OpenTofu registry versions endpoint for `hashicorp/aws`: https://registry.opentofu.org/v1/providers/hashicorp/aws/versions
- Live OpenTofu registry download endpoint for `hashicorp/aws` v5.31.0 on `linux/amd64`: https://registry.opentofu.org/v1/providers/hashicorp/aws/5.31.0/download/linux/amd64
- Live Terraform registry service discovery document used only to validate the explicit third-party registry example: https://registry.terraform.io/.well-known/terraform.json

## Issues Found
- The source address example described `registry.terraform.io/hashicorp/aws` as a fallback. I changed that wording to an explicit third-party registry because OpenTofu shorthand defaults to `registry.opentofu.org`; `registry.terraform.io` is only used when you name it explicitly.
- The service discovery response example showed `login.v1` for `registry.opentofu.org`. I removed it because the public OpenTofu registry currently advertises `modules.v1` and `providers.v1`, not `login.v1`.
- The versions example used `jq '.versions[-3:]'` but paired it with sample output that did not match the current endpoint behavior. I changed the command to `jq '.versions[:3]'` and updated the sample versions and protocol values to match the current public registry output as of 2026-04-24.
- The provider download example had outdated protocol metadata and release URLs. I updated it to the current OpenTofu registry response for `hashicorp/aws` v5.31.0, including the GitHub release URLs and the correct SHA256 checksum.
- The mirror configuration examples used `~/.terraformrc` and an ambiguous path description for the network mirror layout. I updated the file name to `~/.tofurc` and clarified that the JSON paths shown are relative to the configured mirror base URL, matching the provider network mirror protocol.
- The `tofu providers mirror` comment implied a generic download without mentioning configuration context. I clarified that the command mirrors providers required by the current configuration.
- The `tofu init -lockfile=readonly` comment said it verifies whether the lock file was tampered with. I corrected that to describe the actual behavior: OpenTofu refuses lockfile changes and verifies downloaded packages against the checksums already recorded in the lock file.

## Review Notes
- `.terraformrc` remains supported by OpenTofu for backward compatibility, but `.tofurc` is the current OpenTofu-native CLI configuration filename on non-Windows systems.
- Exact version lists, download URLs, and checksums on the public registry are time-sensitive. The examples in this post were validated against the live registry on 2026-04-24.
