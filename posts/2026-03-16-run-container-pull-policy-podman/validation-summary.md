# Validation Summary: How to Run a Container with Pull Policy in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Podman pull policies
- Compose service configuration
- Bash commands

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman pull` official documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `podman images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman image exists` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-exists.1.html
- Podman `podman compose` official documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Compose Specification service `pull_policy`: https://compose-spec.github.io/compose-spec/spec.html
- Docker Registry HTTP API v2, used to verify the Alpine 3.20 manifest digest: https://distribution.github.io/distribution/spec/api/

## Issues Found
- The `newer` policy was described as pulling when the registry has a "newer version." Podman's official documentation defines this as a digest comparison: the image is considered newer when the digests differ. Updated the wording to avoid implying timestamp-based comparison.
- The digest example used `sha256:abcdef1234567890`, which is not a valid SHA-256 digest and would not work as a container image reference. Replaced it with a verified full digest for `docker.io/library/alpine:3.20`.

## Review Notes
Podman's `podman compose` command is a wrapper around an external Compose provider, so exact Compose behavior can depend on whether the provider is Docker Compose or podman-compose. The `pull_policy` field itself is part of the Compose Specification and the shown values are valid.
