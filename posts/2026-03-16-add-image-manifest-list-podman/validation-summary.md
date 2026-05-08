# Validation Summary: How to Add an Image to a Manifest List with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Manifest lists and OCI image indexes
- Multi-architecture container builds
- Bash
- jq

## Sources Consulted
- Podman manifest add documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman manifest create documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-create.1.html
- Podman manifest inspect documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-inspect.1.html
- Podman manifest remove documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-remove.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman manifest overview: https://docs.podman.io/en/v5.4.2/markdown/podman-manifest.1.html

## Issues Found
- Local image examples omitted the `containers-storage:` transport, while Podman's manifest add documentation identifies `docker://` as the default transport and `containers-storage:` as the transport for local image storage. Updated local-image examples to use explicit `containers-storage:localhost/...` references.
- The Docker Hub example used `docker.io/library/myapp`, which implies a non-existent official image namespace. Updated it to a user namespace placeholder.
- The incremental CI example built and pushed architecture-specific images on separate machines while also implying that each machine updated the same local manifest list. Updated the example so it adds already-pushed remote architecture images to a local manifest assembly.
- The duplicate-platform check grouped only by architecture, which can incorrectly flag legitimate entries that share an architecture but differ by OS or variant. Updated the jq expression to group by OS, architecture, and variant.
- The complete CI/CD workflow added locally built registry-tagged images without an explicit local-storage transport. Updated the command to use `containers-storage:`.

## Review Notes
Podman was not installed in the review environment, so command behavior was checked against the current official Podman documentation instead of local `podman --help` output.
