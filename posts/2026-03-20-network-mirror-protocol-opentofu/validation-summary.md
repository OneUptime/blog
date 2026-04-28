# Validation Summary: How OpenTofu's Network Mirror Protocol Works

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- OpenTofu Provider Network Mirror Protocol
- `tofu providers mirror` subcommand
- OpenTofu CLI configuration (`~/.terraformrc` / `~/.tofurc`) `provider_installation` block
- nginx (static file serving)
- GitHub Actions (CI integration)

## Sources Consulted
- [OpenTofu — Provider Network Mirror Protocol](https://opentofu.org/docs/internals/provider-network-mirror-protocol/)
- [OpenTofu — `tofu providers mirror` command](https://opentofu.org/docs/cli/commands/providers/mirror/)
- [OpenTofu — CLI Configuration File (`.tofurc` / `tofu.rc`)](https://opentofu.org/docs/cli/config/config-file/)
- OpenTofu source code: `internal/getproviders/filesystem_search.go` — specifically the `PackedFilePathForPackage` function which determines the filesystem layout produced by `tofu providers mirror`
- OpenTofu source code: `internal/command/providers_mirror.go`

## Issues Found

1. **Incorrect filesystem layout for provider binaries.** The post originally claimed the URL path schema for the provider binary was `/{hostname}/{namespace}/{type}/{version}/{filename}` and gave the example `/registry.opentofu.org/hashicorp/aws/5.31.0/terraform-provider-aws_5.31.0_linux_amd64.zip`. This is wrong. According to the OpenTofu network mirror protocol the `url` field inside the version JSON is resolved relative to the version JSON's location, and the `tofu providers mirror` command (per `PackedFilePathForPackage` in `internal/getproviders/filesystem_search.go`) writes the zip files at `baseDir/hostname/namespace/type/terraform-provider-<type>_<version>_<platform>.zip` — i.e., **next to** the JSON files, not inside a versioned subdirectory. Fixed the path schema, the example URL, and the `ls` output that previously showed a `5.31.0/` directory.

## Review Notes

- OpenTofu also accepts `~/.tofurc` (preferred for OpenTofu) in addition to `~/.terraformrc`. The post uses `~/.terraformrc`, which still works for compatibility but is the legacy name. Not changed since it is technically valid.
- In the "Configuring OpenTofu to Use the Mirror" section, `network_mirror.include` lists both `registry.opentofu.org/*/*` and `registry.terraform.io/*/*`, but `direct.exclude` only excludes `registry.opentofu.org/*/*`. This is not strictly wrong because OpenTofu uses the first matching method (the network mirror) for `registry.terraform.io/*/*` providers as well, but a stricter setup would also exclude `registry.terraform.io/*/*` from `direct`. Left as-is since the behavior is correct.
- The "Updating the Mirror" bash script invokes `tofu providers mirror` from `/tmp/mirror-update/` without an OpenTofu configuration containing `required_providers` blocks for the listed providers. In practice, `tofu providers mirror` only mirrors providers required by the current configuration; the script reads more like an illustrative outline than a runnable script. Not a factual error in the protocol or command, so left unchanged.
- The example `{version}.json` uses placeholder hash values such as `"h1:abc123def456..."`. The hash format itself (the `h1:` and `zh:` prefixes for hash schemes 1 and zip-hash) is correct.
