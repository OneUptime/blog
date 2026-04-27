# Validation Summary: Using OCI Registries as Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.10+)
- OCI (Open Container Initiative) registries
- Terraform module syntax (HCL)
- ORAS (OCI Registry As Storage) CLI
- Docker Hub, GitHub Container Registry (GHCR), AWS ECR, Google Artifact Registry
- AWS CLI, gcloud CLI, docker CLI

## Sources Consulted
- [OpenTofu — Module Sources](https://opentofu.org/docs/language/modules/sources/)
- [OpenTofu — Module Packages in OCI Registries](https://opentofu.org/docs/cli/oci_registries/module-package/)
- [OpenTofu — OCI Registry Integrations](https://opentofu.org/docs/cli/oci_registries/)
- [OpenTofu 1.10.0 Release Announcement](https://opentofu.org/blog/opentofu-1-10-0/)
- [ORAS — `oras tag` command reference](https://oras.land/docs/commands/oras_tag/)

## Issues Found

1. **Wrong source-address syntax (Docker-style colon tag).** Every `oci://` example used `oci://host/repo:vX.Y.Z`. OpenTofu does not parse the colon as a tag — tags and digests are passed via query parameters (`?tag=` or `?digest=`). Replaced all occurrences with `?tag=vX.Y.Z` so OpenTofu actually resolves the intended artifact.

2. **Wrong artifact type and packaging format.** The "Publishing a Module" section packaged the module as `tar.gz` and pushed it with the layer media type `application/vnd.opentofu.module.v1+tar+gzip`. Per the official spec, OpenTofu module packages must be `.zip` archives whose layer `mediaType` is `archive/zip`, and the manifest's `artifactType` must be exactly `application/vnd.opentofu.modulepkg`. Updated the packaging command to use `zip -r`, replaced the layer media type with `archive/zip`, and added the required `--artifact-type=application/vnd.opentofu.modulepkg` flag to `oras push`.

3. **Wrong `oras tag` syntax.** The post passed two full registry references (`<repo>:v2.1.0` and `<repo>:latest`) to `oras tag`. The actual `oras tag` CLI takes a source reference followed by one or more *tag names* (not full references). Changed to `oras tag <repo>:v2.1.0 latest`.

4. **Incorrect `required_version` in the complete example.** The example declared `required_version = ">= 1.7"`, but OCI module sources were introduced in OpenTofu 1.10. With `>= 1.7`, an OpenTofu 1.7/1.8/1.9 install would parse the config and then fail to fetch the OCI module. Bumped to `">= 1.10"`.

## Review Notes
- The ORAS install line (`brew install oras`) is correct (Homebrew formula `oras` exists). Linux users will need an alternative install method, but the post does not claim to be exhaustive.
- The authentication section is left as-is: OpenTofu reuses the standard Docker credential store / `~/.docker/config.json`, so `docker login`, `aws ecr get-login-password | docker login`, `gcloud auth configure-docker`, and `echo $TOKEN | docker login ghcr.io ...` are all valid ways to populate credentials that OpenTofu will then pick up.
- For maximum reproducibility, readers should prefer `?digest=sha256:...` over `?tag=`. Worth mentioning in a future revision but not strictly an error.
- "GCR" in the intro/conclusion technically refers to the older `gcr.io` Container Registry (now superseded by Artifact Registry at `*.pkg.dev`); both are still reachable, so the statement is not wrong.
