# Validation Summary: How to Implement Image Tagging Strategies with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container image tagging
- Container registries
- Skopeo
- OCI image metadata labels and annotations
- Git-based versioning
- Bash scripting

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman `podman tag` documentation: https://docs.podman.io/en/stable/markdown/podman-tag.1.html
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `podman auto-update` documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Skopeo official repository and command documentation: https://github.com/containers/skopeo
- OCI Image Format Specification annotations: https://specs.opencontainers.org/image-spec/?v=v1.1.1

## Issues Found
- The date-based tagging snippet used `${GIT_SHA}` without defining it in that snippet. Added `GIT_SHA=$(git rev-parse --short HEAD)` before the date-plus-SHA build command.
- The comprehensive script parsed every exact git tag as SemVer. Added a SemVer pattern check so major and minor tags are only generated from tags like `1.2.3` or `v1.2.3`.
- The OCI metadata section called the keys "standard OCI labels." OCI defines these as annotation keys, although they are commonly set as image labels through Dockerfile `LABEL` or `podman build --label`. Updated the wording to be precise.
- The label-query section said it queried labels from running containers, but the examples inspect an image reference. Updated the heading to "Query labels from images."
- The Skopeo delete example described deleting old tags. Skopeo delete marks an image manifest for deletion, which can affect all tags pointing to that manifest. Updated the comment to avoid implying tag-only deletion.
- The cleanup script sorted the human-readable `.Created` field, which is not a reliable chronological sort key. Updated it to use `podman images --sort created --format '{{.Tag}}'` and filter out `<none>` tags.
- The auto-update section implied a normal detached container can be updated and restarted directly by `podman auto-update`. Podman documentation states registry auto-update requires a fully qualified image reference and restarts the systemd unit executing the container. Updated the wording and comments to specify systemd-managed containers.

## Review Notes
The local review environment did not have `podman` or `skopeo` installed, so CLI validation was performed against official documentation rather than local `--help` output. The examples remain intentionally generic and may still need registry authentication or registry-specific garbage collection behavior in real deployments.
