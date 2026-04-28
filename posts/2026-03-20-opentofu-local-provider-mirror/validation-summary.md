# Validation Summary: Setting Up a Local Provider Mirror in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (CLI: `tofu providers mirror`, `tofu providers lock`, `tofu init`)
- OpenTofu CLI configuration (`.tofurc` / `.terraformrc`, `provider_installation`, `filesystem_mirror`, `direct`)
- HCL configuration syntax
- Docker (Ubuntu base image, OpenTofu install via .deb)

## Sources Consulted
- OpenTofu `providers mirror` command docs: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu `providers lock` command docs: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu CLI configuration file docs (`provider_installation`, `filesystem_mirror`, `direct`, include/exclude): https://opentofu.org/docs/cli/config/config-file/
- OpenTofu environment variables docs: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `init` command docs (for `-plugin-dir`): https://opentofu.org/docs/cli/commands/init/
- OpenTofu releases (verifying v1.7.0): https://github.com/opentofu/opentofu/releases/tag/v1.7.0

## Issues Found
- **Fabricated `TOFU_PROVIDER_MIRROR` environment variable.** The original post claimed `export TOFU_PROVIDER_MIRROR=/opt/terraform-mirror` would configure a mirror. This environment variable does not exist in OpenTofu — there is no documented variable of this name in OpenTofu's environment variable docs or CLI config docs. Replaced with `TF_CLI_CONFIG_FILE`, which is a documented OpenTofu env var that points to a custom CLI configuration file (where `filesystem_mirror` can be configured).
- **Misleading `TF_CLI_ARGS_providers_lock` example.** `TF_CLI_ARGS_<name>` is documented for single-word subcommands (e.g. `TF_CLI_ARGS_plan`); the docs do not specify behavior for multi-word commands like `providers lock`, and even if it worked it would only inject args into one specific subcommand rather than configure a mirror generally. Replaced with `tofu init -plugin-dir=/opt/terraform-mirror`, which the OpenTofu init docs explicitly describe as forcing OpenTofu to read providers "only from the specified directory, as if it had been configured as a `filesystem_mirror` in the CLI configuration." Also renamed the section heading accordingly.

## Review Notes
- The directory layout shown (`HOSTNAME/NAMESPACE/TYPE/...`) matches OpenTofu's documented "packed" filesystem mirror layout. The `.json` index files alongside `.zip` packages are produced by `tofu providers mirror` (used for the network mirror protocol) and are correct to show.
- `tofu providers mirror -platform=...` and `tofu providers lock -fs-mirror=... -platform=...` flags are accurate per the OpenTofu CLI docs.
- The `provider_installation { filesystem_mirror { path, include } direct { exclude } }` block syntax matches the official docs.
- The example uses OpenTofu v1.7.0 in the Dockerfile (released April 30, 2024). v1.7.0 is a real release but is now several minor versions behind the current latest (v1.11.x as of April 2026). The example still works but readers may want to bump to a newer release in production.
- The post uses `registry.opentofu.org` paths with the `hashicorp/` namespace, which matches how the OpenTofu registry mirrors HashiCorp-namespaced providers.
