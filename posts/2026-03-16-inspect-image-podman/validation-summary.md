# Validation Summary: How to Inspect an Image with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- OCI image configuration
- Go template formatting
- Shell scripting

## Sources Consulted
- Podman `podman inspect` documentation: https://docs.podman.io/en/v5.4.0/markdown/podman-inspect.1.html
- Podman `podman image inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman image inspect data structure documentation: https://pkg.go.dev/github.com/containers/podman/v6/pkg/inspect
- OCI ImageConfig Go type documentation: https://pkg.go.dev/github.com/opencontainers/image-spec/specs-go/v1#ImageConfig

## Issues Found
- The opening quote said inspecting an image reveals "everything" about how it was built and configured. Podman inspect exposes detailed metadata, configuration, history, and layer information, but it does not necessarily reveal every build input or the full original Dockerfile/Containerfile. Changed "everything" to "detailed metadata" for technical accuracy.

## Review Notes
The commands and template fields used in the post are consistent with current Podman documentation and the OCI image configuration fields exposed through Podman's inspect output. `podman inspect` defaults to inspecting multiple object types and may return a container before an image if names collide; the post already includes `podman image inspect` as the explicit image-specific form.
