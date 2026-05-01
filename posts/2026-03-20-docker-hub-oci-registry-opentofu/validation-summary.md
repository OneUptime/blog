# Validation Summary: How to Use Docker Hub as OCI Registry for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Docker Hub
- OCI registries and OCI image layouts
- ORAS CLI
- GitHub Actions
- Bash
- HCL
- YAML

## Sources Consulted
- OpenTofu: Provider Mirrors in OCI Registries - https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu: Module Packages in OCI Registries - https://opentofu.org/docs/cli/oci_registries/module-package/
- OpenTofu: OCI Registry Credentials - https://opentofu.org/docs/cli/oci_registries/credentials/
- OpenTofu: CLI Configuration File - https://opentofu.org/docs/v1.11/cli/config/config-file/
- Docker Docs: Software artifacts on Docker Hub - https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/
- Docker Docs: Docker Hub usage and limits - https://docs.docker.com/docker-hub/usage/
- Docker Docs: Docker Hub pull usage and limits - https://docs.docker.com/docker-hub/usage/pulls/
- Docker Docs: docker login - https://docs.docker.com/reference/cli/docker/login/
- ORAS Docs: oras login - https://oras.land/docs/commands/oras_login/
- ORAS Docs: oras push - https://oras.land/docs/commands/oras_push/
- ORAS Docs: oras tag - https://oras.land/docs/commands/oras_tag/
- ORAS Docs: Distributing OCI Layouts - https://oras.land/docs/how_to_guides/distributing_oci_layouts/
- ORAS GitHub releases - https://github.com/oras-project/oras/releases
- GitHub: peter-evans/dockerhub-description - https://github.com/peter-evans/dockerhub-description

## Issues Found
- The provider publishing example was not compatible with OpenTofu provider mirrors. OpenTofu requires a per-version OCI image index with per-platform manifests of type `application/vnd.opentofu.provider-target`, not a single flat `oras push` with custom layer media types. I replaced the provider script and the GitHub Actions example with the documented ORAS layout, index creation, and `oras cp` flow.
- The module publishing example used a `.tgz` archive, nonstandard media types, and `oci://...:version` source syntax. OpenTofu module OCI packages must use a single `.zip` layer with media type `archive/zip`, artifact type `application/vnd.opentofu.modulepkg`, and `?tag=` query syntax in the module source address. I corrected the script and the HCL example accordingly.
- The OpenTofu CLI configuration example used `~/.terraform.rc`, an `oci_mirror` `url` argument, and a generic `credentials` block. The correct OpenTofu configuration uses `~/.tofurc`, `repository_template` for `oci_mirror`, and `oci_credentials` for OCI registry credentials. I updated those snippets and clarified Docker-style credential reuse.
- The Docker login examples used `--password`, which is not the recommended non-interactive pattern in current Docker docs. I changed those examples to `--password-stdin`.
- The post overstated Docker Hub free-tier behavior by claiming unlimited pulls. Current Docker docs show unlimited public repositories on Personal plans, but pull limits still apply to anonymous users and authenticated Personal users. I corrected the introduction, rate-limit section, and conclusion.
- The GitHub Actions example installed ORAS `v1.1.0`, but the provider mirror workflow depends on commands introduced in ORAS `v1.3.0`. I updated the workflow to use `v1.3.0`.

## Review Notes
- OpenTofu supports OCI registries directly for module packages, but provider installation uses OCI as a mirror target rather than as the provider source address itself.
- Docker's published pull-limit documentation is written in terms of image pulls, so the post now phrases the rate-limit discussion accordingly.
