# Validation Summary: How to Use GCP Artifact Registry as OCI Registry for OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu OCI provider mirrors
- OpenTofu OCI module packages
- Google Cloud Artifact Registry
- Google Cloud IAM
- Cloud Build
- ORAS CLI
- Terraform Google provider
- HCL
- Bash

## Sources Consulted
- [OpenTofu OCI Registry Integrations](https://opentofu.org/docs/cli/oci_registries/)
- [OpenTofu Provider Mirrors in OCI Registries](https://opentofu.org/docs/cli/oci_registries/provider-mirror/)
- [OpenTofu Module Packages in OCI Registries](https://opentofu.org/docs/cli/oci_registries/module-package/)
- [OpenTofu OCI Registry Credentials](https://opentofu.org/docs/cli/oci_registries/credentials/)
- [OpenTofu CLI Configuration File](https://opentofu.org/docs/v1.11/cli/config/config-file/)
- [OpenTofu `tofu providers mirror` command](https://opentofu.org/docs/cli/commands/providers/mirror/)
- [Google Cloud Artifact Registry supported formats](https://docs.cloud.google.com/artifact-registry/docs/supported-formats)
- [Google Cloud Artifact Registry Docker authentication](https://docs.cloud.google.com/artifact-registry/docs/docker/authentication)
- [Google Cloud Artifact Registry access control](https://docs.cloud.google.com/artifact-registry/docs/access-control)
- [Google Cloud Artifact Registry and Cloud Build](https://cloud.google.com/artifact-registry/docs/configure-cloud-build)
- [ORAS `oras push` command reference](https://oras.land/docs/commands/oras_push)
- [ORAS `oras tag` command reference](https://oras.land/docs/commands/oras_tag/)
- [ORAS `oras login` command reference](https://oras.land/docs/commands/oras_login/)

## Issues Found
1. **Incorrect authentication guidance for OpenTofu**: The post used `gcloud auth configure-docker` and implied that this would transparently cover both ORAS and OpenTofu. OpenTofu’s OCI credential docs instead center on Docker-style config files populated by tools such as `oras login`, and its credential-helper behavior is more restrictive than Docker’s. I changed the examples to use a short-lived Google access token with `oras login`, which writes credentials in a format OpenTofu can discover.
2. **Provider publishing flow did not match OpenTofu’s required OCI layout**: The original script pushed multiple files as one artifact with custom media types and a flat repository name like `hashicorp-google`. OpenTofu provider mirrors require per-platform manifests with `artifactType` `application/vnd.opentofu.provider-target`, `archive/zip` layers, and a top-level OCI image index with `artifactType` `application/vnd.opentofu.provider`. I rewrote the script to follow the documented ORAS flow and changed the repository layout to `.../opentofu-providers/hashicorp/google:VERSION`.
3. **Module packaging format was wrong**: The original module example used a `.tgz` archive and custom module media types. OpenTofu module packages in OCI registries must be a `.zip` archive stored as a single `archive/zip` layer with artifact type `application/vnd.opentofu.modulepkg`. I changed the packaging and push commands accordingly.
4. **Incorrect `oras tag` usage**: The original module example passed repository components as separate arguments. ORAS expects `oras tag <reference> <new_tag> [...]`. I corrected the command to `oras tag "$ARTIFACT" latest`.
5. **Incorrect OpenTofu CLI config example**: The post used `~/.terraform.rc`, an `oci_mirror` argument named `url`, and a mirror path that did not match OpenTofu’s documented `repository_template` syntax. I corrected the filename to `~/.tofurc`, switched to `repository_template`, and aligned the repository mapping with the provider mirror layout used in the script.
6. **Incorrect OCI module source syntax**: The module example used `oci://.../gke:2.0.0`. OpenTofu’s OCI module docs use query parameters such as `?tag=2.0.0` or default to `latest`. I updated the source string to the documented format.
7. **Cloud Build example was incomplete and version-mismatched**: The build step invoked `tofu` without installing OpenTofu, and it pinned ORAS `v1.1.0` even though OpenTofu’s provider mirror docs rely on ORAS features introduced in `v1.3.0`. I added OpenTofu installation, upgraded ORAS to `v1.3.0`, and aligned the auth step with the corrected login flow.
8. **Provider support claim needed narrowing**: OpenTofu supports OCI registries directly for modules, but for providers it currently supports OCI only as a secondary mirror, not a primary source. I adjusted the introduction and conclusion to reflect that distinction.

## Review Notes
- The Artifact Registry repository examples are otherwise valid: `format = "DOCKER"` is the correct repository format for OCI artifacts in Artifact Registry, and `us` is a valid multi-region location.
- The repository-level IAM examples are valid. Google Cloud docs explicitly show `google_artifact_registry_repository_iam_member` with `repository = google_artifact_registry_repository.<name>.name`, and `domain:company.com` is a supported principal format.
- Artifact Registry documentation notes that Cloud Build in the same project already has upload/download access by default, but explicit `roles/artifactregistry.writer` bindings are still appropriate when using a custom build service account or crossing project boundaries.
