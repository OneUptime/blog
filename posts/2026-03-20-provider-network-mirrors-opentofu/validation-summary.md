# Validation Summary: How to Use Provider Network Mirrors in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider network mirror protocol
- OpenTofu CLI configuration (`provider_installation`, `credentials`)
- nginx
- Bash
- HCL

## Sources Consulted
- OpenTofu Provider Network Mirror Protocol: https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu `providers mirror` command: https://opentofu.org/docs/cli/commands/providers/mirror/

## Issues Found
- The post described the network mirror protocol using `/v1/providers/...` and `/download/<os>/<arch>` endpoints. I corrected this to the documented mirror layout: `/<hostname>/<namespace>/<type>/index.json` for version discovery and `/<hostname>/<namespace>/<type>/<version>.json` for package metadata, with archive URLs supplied by the metadata response.
- The post described the mirror as an internal HTTP server. OpenTofu documents `network_mirror.url` as requiring the `https:` scheme, so I corrected the description and introduction to say HTTPS.
- The CLI config filename guidance used `~/.terraform.rc` and `/etc/opentofu/terraform.rc`, which do not match OpenTofu's documented naming. I corrected the guidance to `.tofurc` / `.terraformrc` compatibility and changed the custom config example to a `*.tfrc` filename for use with `TF_CLI_CONFIG_FILE`.
- The authentication section stated that OpenTofu does not natively support mirror authentication. I corrected this to the documented behavior: OpenTofu can send credentials to mirror metadata endpoints when a `credentials` block is configured for the mirror hostname, but it does not send those credentials to archive URLs returned by the mirror.
- The initial `tofu providers mirror` setup step did not state that the command must be run from a configuration directory containing the provider requirements. I clarified that requirement in the command comment.

## Review Notes
- OpenTofu CLI was not installed in this workspace, so command validation was performed against the official OpenTofu command and configuration documentation rather than local `tofu --help` output.
- The nginx example remains broadly workable for static hosting of the generated mirror directory, but future maintenance should keep the mirror base URL and the published directory layout aligned if the deployment is moved under a subpath.
