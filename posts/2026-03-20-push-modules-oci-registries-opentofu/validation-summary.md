# Validation Summary: How to Push Modules to OCI Registries with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OCI registries
- ORAS CLI
- GitHub Actions
- GitHub Container Registry (GHCR)
- Bash

## Sources Consulted
- OpenTofu: Module Packages in OCI Registries - https://opentofu.org/docs/cli/oci_registries/module-package/
- OpenTofu: OCI Registry Integrations - https://opentofu.org/docs/cli/oci_registries/
- OpenTofu: Module Blocks - https://opentofu.org/docs/language/modules/syntax/
- ORAS CLI: `oras push` - https://oras.land/docs/commands/oras_push/
- ORAS CLI: `oras tag` - https://oras.land/docs/commands/oras_tag/
- ORAS CLI: `oras pull` - https://oras.land/docs/commands/oras_pull/
- ORAS CLI: `oras repo ls` - https://oras.land/docs/commands/oras_repo_ls/
- ORAS CLI: `oras repo tags` - https://oras.land/docs/commands/oras_repo_tags/
- GitHub Docs: Working with the Container registry - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Use `GITHUB_TOKEN` for authentication in workflows - https://docs.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token
- OpenTofu releases - https://github.com/opentofu/opentofu/releases
- ORAS releases - https://github.com/oras-project/oras/releases

## Issues Found
- The post said OCI modules use the `oci::` prefix. I changed this to the correct OpenTofu OCI source address form, `oci://`, because that is the documented syntax.
- The packaging examples used `.tgz` archives and custom media types such as `application/vnd.opentofu.module.v1.tar+gzip`. I changed these to the documented OpenTofu OCI module format: a `.zip` archive pushed with `--artifact-type application/vnd.opentofu.modulepkg` and a single `archive/zip` layer.
- The `oras tag` examples used an incorrect argument structure that split the registry and repository into separate parameters. I corrected them to the documented ORAS form that tags an existing reference and then supplies one or more new tag names.
- The inventory script used `oras repo ls ... --prefix module-`, but `oras repo ls` does not support a `--prefix` flag. I removed that flag and updated the shell logic to filter `module-` repositories after listing them.
- The GitHub Actions workflow downloaded OpenTofu from a non-existent asset name pattern (`opentofu_...`). I corrected it to the valid official release asset naming (`tofu_...`) and updated the pinned OpenTofu and ORAS versions to current releases available on 2026-04-24.
- The conclusion implied OCI module consumers get module-registry-style version constraints. I revised that wording to say consumers choose explicit OCI tags in the source string instead, which matches OpenTofu's documented behavior for non-registry module sources.

## Review Notes
- The post is technically correct after the fixes above.
- The workflow pins `oras` 1.3.0 and OpenTofu 1.11.6, which were valid current releases when reviewed on 2026-04-24 and may need periodic refresh later.
- For OCI module sources, OpenTofu supports selecting a tag or digest in the source string; the separate `version` argument is only for module registry sources.
