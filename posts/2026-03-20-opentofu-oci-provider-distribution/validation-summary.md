# Validation Summary: Distributing OpenTofu Providers via OCI Registries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (OCI registry integration: `oci_mirror`, `oci_credentials`, `oci://` module sources)
- ORAS (OCI Registry As Storage) CLI
- Docker / containers credential files (`~/.docker/config.json`, `containers/auth.json`)
- Harbor (corporate OCI registry)
- HCL configuration (`required_providers`, `provider_installation`, `module`)

## Sources Consulted
- OpenTofu OCI Registries overview — https://opentofu.org/docs/cli/oci_registries/
- OpenTofu Module Sources (OCI Distribution Repository) — https://opentofu.org/docs/language/modules/sources/
- OpenTofu Module Packages in OCI Registries — https://opentofu.org/docs/cli/oci_registries/module-package/
- OpenTofu Provider Mirrors in OCI Registries — https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu OCI Registry Credentials — https://opentofu.org/docs/cli/oci_registries/credentials/
- OpenTofu CLI Configuration File — https://opentofu.org/docs/cli/config/config-file/
- OpenTofu RFC tracker for OCI registries (issue #2540) and PR #2637

## Issues Found

1. **Provider source format used `oci://` directly in `required_providers`.** OpenTofu does not support OCI as a primary provider installation source — only as a *mirror*. Providers must keep their standard source address (`hostname/namespace/type`) and OCI repositories are configured via the `oci_mirror` block in the CLI configuration. Updated the "Configuring OCI Provider Sources" section and the Harbor and CI examples to reflect this, including a correct `oci_mirror` block with `repository_template` and `include`.

2. **`provider_installation { oci { ... } }` block does not exist.** The actual installation method is `oci_mirror`, which requires `repository_template` (with `${hostname}`, `${namespace}`, `${type}` interpolations) and `include`/`exclude` patterns. Replaced all occurrences.

3. **Module source URL used a Docker-style `:tag` suffix** (`oci://.../vpc:v2.1.0`). OpenTofu uses query-parameter selectors instead: `?tag=v2.1.0` or `?digest=sha256:...`. Updated the module source example.

4. **Module package format was tar.gz with a custom media type** (`application/vnd.opentofu.module.v1+tar+gzip`). OpenTofu requires module packages to be ZIP files with `--artifact-type=application/vnd.opentofu.modulepkg` and a single layer of media type `archive/zip`. Rewrote the module push example.

5. **Provider OCI artifact layout was wrong.** The original `oras push` attached two zips with `application/zip` and added invented `org.opentofu.provider.*` annotations. The OpenTofu spec calls for one manifest per OS/arch with `artifactType` `application/vnd.opentofu.provider-target` and `--artifact-platform`, combined into an index manifest with `artifactType` `application/vnd.opentofu.provider`. Layer media type must be `archive/zip` (not `application/zip`). Replaced both the standalone push example and the CI script with the correct multi-step `oras push` / `oras manifest index create` / `oras cp` workflow against an `--oci-layout`.

6. **Credential discovery section claimed OpenTofu reads `DOCKER_USERNAME` / `DOCKER_PASSWORD` env vars.** It does not. OpenTofu searches Docker-style config files (`containers/auth.json` paths under `$XDG_RUNTIME_DIR`, `$HOME/.config`, `$XDG_CONFIG_HOME`, plus `~/.docker/config.json` and `~/.dockercfg`) and supports explicit `oci_credentials` / `oci_default_credentials` blocks. Replaced the comment with the correct list and added a brief `oci_credentials` example.

## Review Notes
- The CI script's `zip` invocation now relies on the binaries existing in the working directory; that matches the original style.
- The OCI provider distribution feature is relatively new and still evolving — readers using older OpenTofu versions (pre-1.8) may not have access to `oci_mirror`. The post does not call out a minimum version; consider adding one in a future revision.
- "Air-gapped" use of OCI mirrors still requires an internal registry that the hosts can reach; this nuance is implicit in the post and is fine.
- The Harbor `harbor-values.yaml` snippet is illustrative only (not a complete Harbor install) — left as-is since it's labelled as such.
