# Validation Summary: How to Remove Dangling Images with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Containerfile
- Shell commands

## Sources Consulted
- Podman `podman images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman image prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-image-prune.1.html
- Podman `podman rmi` official documentation: https://docs.podman.io/en/stable/markdown/podman-rmi.1.html
- Podman `podman system df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman build` official documentation: https://docs.podman.io/en/v4.8.0/markdown/podman-build.1.html

## Issues Found
- The introduction described dangling images only as layers with no tags or names. Podman documentation describes dangling images as untagged images or filesystem layers that are not referenced by another image, so the wording was corrected.
- The command labeled "Calculate total space used by dangling images" only printed each dangling image's reported size and did not calculate a total. The comment was changed to "List the reported sizes of dangling images."
- The bulk removal example used `xargs podman rmi`, which can invoke `podman rmi` with no image IDs when there are no dangling images. The example was changed to a `while read` loop that removes IDs only when present.

## Review Notes
Podman `podman system df` reports image reclaimable space, but the official documentation notes that reclaimable image size can be inaccurate when images share layers. The monitoring example remains usable as a rough indicator rather than an exact dangling-image total.
