# Validation Summary: How to Use OCI Artifacts for Configuration Distribution with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- OCI artifacts
- OCI registries / distribution
- Bash
- YAML
- `jq`

## Sources Consulted
- Podman artifact overview: https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman artifact add: https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Podman artifact inspect: https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Podman artifact pull: https://docs.podman.io/en/stable/markdown/podman-artifact-pull.1.html
- Podman artifact push: https://docs.podman.io/en/latest/markdown/podman-artifact-push.1.html
- Podman artifact extract: https://docs.podman.io/en/latest/markdown/podman-artifact-extract.1.html
- OCI Image Format Specification: https://github.com/opencontainers/image-spec/blob/main/manifest.md
- OCI Distribution Specification: https://oci-playground.github.io/specs-latest/specs/distribution/v1.0.0/oci-distribution-spec.html

## Issues Found
- The deployment example only pulled the artifact into Podman’s local artifact store but did not extract the configuration files for actual use. I updated the example to create a target directory and run `podman artifact extract`.
- The `jq` expression in the deployment example used `.layers[]`, but current `podman artifact inspect` JSON exposes layers under `.Manifest.layers[]`. I corrected the JSON path.
- The `latest` retagging example used `podman artifact add` without `--replace`. Current Podman docs require `--replace` to overwrite an existing artifact name in the local store, so I added it.
- The automation example incorrectly treated `podman artifact inspect` as a way to query a remote registry digest. Current Podman docs state that `podman artifact inspect` operates on artifacts in the local store. I changed the script to pull first, read the local digest with `--format '{{.Digest}}'`, compare it with the saved digest, and extract the artifact when the digest changes.

## Review Notes
- The post is now technically consistent with the current Podman artifact manpages as of May 7, 2026.
- `podman artifact inspect` is a local-store operation, so any workflow that needs usable files on disk must include `podman artifact extract` after `pull`.
- Extracting into an existing directory overwrites matching files but does not remove files that were deleted from a newer artifact version. A future revision could mention a cleanup or sync strategy if that behavior matters for deployments.
