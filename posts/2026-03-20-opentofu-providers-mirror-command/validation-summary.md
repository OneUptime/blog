# Validation Summary: Using tofu providers mirror in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (CLI: `tofu providers mirror`, `tofu providers lock`, `tofu init`)
- OpenTofu CLI configuration (`.tofurc`, `provider_installation { filesystem_mirror { ... } }`)
- OpenTofu Provider Mirror Protocol (filesystem mirror layout, version JSON metadata)
- Bash scripting
- Docker (Ubuntu 22.04 multi-stage build)
- Terraform/OpenTofu provider source addressing (`registry.opentofu.org/hashicorp/aws`)

## Sources Consulted
- [OpenTofu — Command: providers mirror](https://opentofu.org/docs/cli/commands/providers/mirror/)
- [OpenTofu — Command: providers lock](https://opentofu.org/docs/cli/commands/providers/lock/)
- [OpenTofu — Provider Network Mirror Protocol](https://opentofu.org/docs/internals/provider-network-mirror-protocol/)
- [OpenTofu v1.7.0 GitHub release assets](https://github.com/opentofu/opentofu/releases/tag/v1.7.0) (verified the actual `.deb` filename via `gh release view`)

## Issues Found
1. **Incorrect Dockerfile download URL and filename for OpenTofu 1.7.0.** The post used `https://releases.opentofu.org/opentofu/1.7.0/tofu_1.7.0_linux_amd64.deb`, but `releases.opentofu.org` is not a real OpenTofu download host (DNS does not resolve), and the actual `.deb` asset is named `tofu_1.7.0_amd64.deb` (no `linux_` prefix). I changed the URL to the official GitHub release asset: `https://github.com/opentofu/opentofu/releases/download/v1.7.0/tofu_1.7.0_amd64.deb`, which is verified to return HTTP 200 and matches the actual asset filename in the v1.7.0 release.
2. **Missing `index.json` in mirror directory structure diagram.** Per OpenTofu's `providers mirror` documentation and the Provider Network Mirror Protocol, the command generates *both* an `index.json` (listing available versions) and per-version JSON files (e.g., `5.38.0.json`). The original tree diagram only showed the version-specific JSON. I added an `index.json` line with a brief comment so the diagram accurately reflects what the command produces.

## Review Notes
- All other technical content was verified and is correct: the `-platform=OS_ARCH` flag (repeatable), the target-directory positional argument, the `tofu providers lock -fs-mirror=PATH -platform=...` syntax, the `provider_installation { filesystem_mirror { path = ..., include = [...] } }` CLI config block, and the `~/.tofurc` location all match official OpenTofu documentation.
- The version-specific JSON example (`archives` → `<platform>` → `url` and `hashes`) is consistent with the Provider Network Mirror Protocol (version metadata response), where hashes prefixed with `zh:` (zip hash) and `h1:` (Terraform hash version 1) are the documented checksum formats.
- The post does not pin to a specific OpenTofu version for the CLI behavior it describes; the commands and flags shown have been stable across the 1.6/1.7/1.8+ series.
- Minor caveat (not corrected because it is opinion/preference, not a technical error): the air-gapped example uses path `/opt/tmp/provider-packages` after extracting a tarball created from `/tmp/provider-packages`. This works because `tar -xzf ... -C /opt/` preserves the original `/tmp/provider-packages` path inside `/opt`, but readers may find it slightly confusing. Left as-is since it is functionally correct.
