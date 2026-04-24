# Validation Summary: How to Push Providers to OCI Registries with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OCI registries
- ORAS CLI
- Make
- Bash
- GitHub Actions

## Sources Consulted
- OpenTofu OCI Registry Integrations: https://opentofu.org/docs/cli/oci_registries/
- OpenTofu Provider Mirrors in OCI Registries: https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Provider Registry Protocol: https://opentofu.org/docs/internals/provider-registry-protocol/
- OpenTofu 1.10 release notes (`What's new in OpenTofu 1.10?`): https://opentofu.org/docs/v1.10/intro/whats-new/
- ORAS `push` command reference: https://oras.land/docs/commands/oras_push/
- ORAS `cp` command reference: https://oras.land/docs/commands/oras_cp
- ORAS `pull` command reference: https://oras.land/docs/commands/oras_pull/
- ORAS `tag` command reference: https://oras.land/docs/commands/oras_tag

## Issues Found
1. **Incorrect OpenTofu version and OCI source model**: The post said OpenTofu `1.8+` supports OCI registries as a provider source. Updated this to `1.10+` and clarified that OCI registries are a secondary installation source (a mirror), not a provider's primary source.

2. **Incorrect `oci_mirror` configuration**: The post used `url = "oci://..."`, which is not the documented argument for `oci_mirror`. Replaced it with the correct `repository_template` form and kept `include`/`exclude` patterns consistent with OpenTofu's CLI configuration docs.

3. **Incorrect OCI artifact structure description**: The post described ad hoc `manifest.json` and `index.json` files in the package directory and included checksum/signature files as OCI payload layers. Updated the section to reflect OpenTofu's documented model: provider ZIPs are the inputs, and ORAS assembles a local OCI image layout plus a version-tagged image index.

4. **Incorrect ORAS publishing flow**: The original `oras push` example used custom config media types and custom layer media types that do not match OpenTofu's required OCI provider mirror format. Replaced it with the documented flow using platform-specific `oras push --artifact-type application/vnd.opentofu.provider-target --artifact-platform ...`, followed by `oras manifest index create --artifact-type application/vnd.opentofu.provider` and `oras cp --from-oci-layout`.

5. **Incorrect ORAS version requirement**: The post installed ORAS `v1.1.0`, but OpenTofu's provider mirror documentation relies on functionality first released in ORAS `v1.3.0`. Updated the installation examples accordingly.

6. **Misleading tag guidance**: The original post tagged the mirror as `latest`. OpenTofu selects provider versions from SemVer-compatible tags and ignores non-version tags. Removed the `latest` tagging step and called out the SemVer requirement in the conclusion.

7. **Makefile correctness problems**: The original Makefile example had command indentation that would not work in a real Makefile, built into `dist/` before creating that directory, referenced an undefined `push-to-oci` target, and generated checksum/signature files that are not part of the OCI mirror format. Replaced it with a working ZIP packaging example aligned with the corrected OCI mirror flow.

8. **Incorrect inspection example path and pull behavior**: The inspection examples pointed at a repository path that no longer matched the documented `repository_template`, and `oras pull` was missing an explicit platform selection for a multi-platform artifact. Updated both commands.

## Review Notes
- OpenTofu still needs an origin provider source address and provider registry metadata. If readers want OCI to be the primary distribution mechanism for a private provider, they still need a provider registry implementation for the provider's source address; the OCI registry is only the mirror.
- The ORAS `manifest index create` command is still marked experimental in ORAS documentation, but it is the workflow OpenTofu's own OCI provider mirror documentation recommends.
