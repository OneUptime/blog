# Validation Summary: How to View Container Filesystem Changes with podman diff

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Container filesystem inspection
- Shell commands

## Sources Consulted
- Official Podman `podman diff` documentation: https://docs.podman.io/en/latest/markdown/podman-diff.1.html
- Official Podman `podman container diff` documentation: https://docs.podman.io/en/latest/markdown/podman-container-diff.1.html
- Official Podman `podman image diff` documentation: https://docs.podman.io/en/stable/markdown/podman-image-diff.1.html
- Official Podman `podman exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Official Podman `podman commit` documentation: https://docs.podman.io/en/v4.3/markdown/podman-commit.1.html

## Issues Found
- The "Diff for Image Layers" section said `podman diff --format json nginx:latest` can be used to see what each layer adds. Official Podman documentation says a single image is compared to its parent layer, or to a second argument when one is provided. I changed the wording and command comment to say the command diffs an image against its parent layer.

## Review Notes
- Podman is not installed in the local workspace, so commands were checked against official documentation rather than local execution.
- The main `podman diff` syntax, JSON format option, A/C/D prefixes, use with stopped containers, and `podman commit` workflow match the official documentation.
