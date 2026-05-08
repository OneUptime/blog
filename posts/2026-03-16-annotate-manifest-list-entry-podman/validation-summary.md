# Validation Summary: How to Annotate a Manifest List Entry with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman manifest lists and OCI image indexes
- Containerfile builds
- OCI image annotations
- Skopeo
- Bash and jq

## Sources Consulted
- Podman `manifest annotate` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-annotate.1.html
- Podman `manifest add` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `manifest inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-inspect.1.html
- Podman `manifest push` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman `manifest remove` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-remove.1.html
- Podman `build` official documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- OCI Image Specification annotations section: https://specs.opencontainers.org/image-spec/

## Issues Found
- The basic syntax showed options after the positional arguments and only referred to a digest. Updated it to match the current official synopsis, which places options before the manifest list name and allows a digest, image, or artifact name.
- The remote Podman manifest inspection example used a `docker://` transport prefix. The official `podman manifest inspect` syntax takes a manifest list or image index name, so the example was changed to `registry.example.com/myapp:latest`. The Skopeo example still correctly uses `docker://`.
- The summary said annotations are preserved through push and pull operations. This was narrowed to preservation when the manifest list or image index is pushed and inspected remotely, which is the behavior demonstrated by the examples and supported by the manifest push/inspect workflow.

## Review Notes
Podman was not installed in the review workspace, so validation was performed against the current official Podman documentation rather than local CLI help. The remaining commands, flags, jq filters, OCI annotation keys, and manifest remove workflow are consistent with the consulted documentation.
