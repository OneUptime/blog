# Validation Summary: OpenTofu Provider Network Mirror Protocol

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider installation configuration
- Filesystem mirrors
- Provider network mirror protocol
- Nginx
- HCL
- Bash
- YAML

## Sources Consulted
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu `tofu providers mirror` command: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu Provider Network Mirror Protocol: https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu source: `internal/command/providers_mirror.go`: https://github.com/opentofu/opentofu/blob/main/internal/command/providers_mirror.go
- OpenTofu source: `internal/command/views/init.go`: https://github.com/opentofu/opentofu/blob/main/internal/command/views/init.go
- OpenTofu source: `internal/getproviders/multi_source.go`: https://github.com/opentofu/opentofu/blob/main/internal/getproviders/multi_source.go

## Issues Found
- The filesystem mirror directory example used an incorrect packed layout. I removed the extra version directory and `SHA256SUMS` file so the example matches the documented packed mirror structure used by `tofu providers mirror`.
- The post described the network mirror as generic HTTP and listed `GET /<download-url>` as a required protocol endpoint. I corrected this to HTTPS and limited the required protocol endpoints to the documented JSON metadata paths, with archive URLs returned by the version-specific JSON document.
- The nginx example would not correctly serve a valid static mirror because it set all content types to JSON and did not align with the configured mirror base URL. I updated it to serve the `tofu providers mirror` output directory directly and only force `application/json` for `.json` files.
- The network mirror configuration example used a `/providers/` base URL that did not match the nginx document root example. I changed the base URL to `https://mirror.internal.example.com/` so the configuration and server example are consistent.
- The verification example showed `tofu init` output as `(filesystem mirror)`, but OpenTofu reports installation/authentication status such as `(verified checksum)`. I corrected the sample output and clarified how to confirm the mirror is actually being used.
- The best-practice advice to include `SHA256` checksum files in the mirror was not aligned with current OpenTofu guidance. I replaced it with `tofu providers lock` guidance, which is the documented way to record official checksums for mirrored installs, especially across platforms.
- I also updated the CLI config filename guidance to prefer `~/.tofurc` while keeping `~/.terraformrc` as the legacy-compatible option, and tightened wording that previously implied only the public registry was relevant.

## Review Notes
- The post is now technically accurate for current OpenTofu documentation as of 2026-04-24.
- OpenTofu also supports `oci_mirror` as a separate provider installation method, but this post is specifically about filesystem and network mirrors, so no expansion was needed.
