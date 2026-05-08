# Validation Summary: How to Export a Container's Filesystem with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- Container filesystem export/import
- Tar archives
- Compression tools: gzip, bzip2, xz
- Shell commands

## Sources Consulted
- Podman `export` official documentation: https://docs.podman.io/en/stable/markdown/podman-export.1.html
- Podman `import` official documentation: https://docs.podman.io/en/stable/markdown/podman-import.1.html
- Podman `save` official documentation: https://docs.podman.io/en/stable/markdown/podman-save.1.html
- Podman `run` official documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `exec` official documentation: https://docs.podman.io/en/stable/markdown/podman-exec.1.html

## Issues Found
- The introductory blockquote said exporting captures the container's "complete state." `podman export` captures the container filesystem as a tar archive, not all image metadata, layers, history, or broader container runtime configuration. Changed this to "filesystem state."
- The single-file extraction example used `tar xf ... -C /tmp/extracted/ ...` without first creating `/tmp/extracted`, which would fail if the directory did not already exist. Added `mkdir -p /tmp/extracted` before the extraction command.

## Review Notes
The `podman export`, `podman import`, and `podman save` examples match the official command syntax and documented behavior. The export-vs-save explanation is accurate: `export` writes a flat container filesystem archive, while `save` preserves image layers and metadata for later loading with `podman load`.
