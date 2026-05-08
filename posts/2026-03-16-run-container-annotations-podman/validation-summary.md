# Validation Summary: How to Run a Container with Annotations in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- OCI image annotations
- Container labels and metadata
- Shell commands
- Alpine Linux / BusyBox

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman `podman pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman pod inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- OCI Image Format Specification annotations: https://oci-playground.github.io/specs-latest/specs/image/ceeb2eba078e8b630f5ee62df2e92323fb521f0e/oci-image-spec.pdf
- Alpine Linux BusyBox overview: https://wiki.alpinelinux.org/wiki/BusyBox
- BusyBox command documentation for `sleep`: https://busybox.net/downloads/BusyBox.html

## Issues Found
- The examples used `alpine sleep infinity`. Alpine uses BusyBox, and BusyBox `sleep` documents numeric durations with optional suffixes rather than `infinity`. Changed these examples to `alpine sleep 3600` so the commands work with the Alpine image.
- The "List containers with annotations" example used `podman ps --format "table {{.Names}}\t{{.Labels}}"`, which lists labels, not annotations. Replaced it with a loop that uses `podman inspect` to print each running container's `.Config.Annotations`.
- The pod section said annotations can be applied to pods, but current `podman pod create` documentation exposes pod labels, not a general `--annotation` option. Updated the section to explain that pods support labels and containers inside pods can have annotations, and adjusted the inspect commands accordingly.
- The key differences section said labels are stored in the container config while annotations are stored in OCI-specific metadata. Since Podman inspect exposes container annotations under `.Config.Annotations`, changed this to the more accurate statement that Podman exposes labels and annotations separately in inspect output.

## Review Notes
- Podman was not installed in the local environment, so command behavior was validated against current official Podman documentation and OCI/BusyBox references rather than by executing containers locally.
