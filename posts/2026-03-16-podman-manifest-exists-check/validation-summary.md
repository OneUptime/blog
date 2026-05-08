# Validation Summary: How to Use podman manifest exists to Check Manifests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Docker manifest lists
- OCI image indexes
- Bash scripting
- Multi-architecture container builds

## Sources Consulted
- Podman `podman-manifest-exists` official documentation: https://docs.podman.io/en/v5.0.3/markdown/podman-manifest-exists.1.html
- Podman `podman-manifest` official documentation: https://docs.podman.io/en/v5.4.2/markdown/podman-manifest.1.html
- Podman `podman-manifest-add` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `podman-manifest-create` official documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman `podman-manifest-push` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman `podman-build` official documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-build.1.html

## Issues Found
- The post described any non-zero exit code from `podman manifest exists` as meaning the manifest does not exist. Official Podman documentation specifies `0` for found, `1` for not found, and `125` for another issue. Updated the exit-code explanation and summary to distinguish `1` from `125`.
- The CI/CD example added locally built images to a manifest without a transport prefix. Official `podman manifest add` documentation states that the default transport is `docker://`, while local container storage images use `containers-storage:`. Updated the example to add `containers-storage:${IMAGE}:${TAG}-${ARCH}`.

## Review Notes
Podman was not installed in the local workspace, so verification was performed against official Podman documentation rather than local `podman --help` output.
