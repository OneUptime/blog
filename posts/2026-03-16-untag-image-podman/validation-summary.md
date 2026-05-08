# Validation Summary: How to Untag an Image with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Container image tagging
- Bash scripting

## Sources Consulted
- Podman `podman-untag` official documentation: https://docs.podman.io/en/latest/markdown/podman-untag.1.html
- Podman `podman-images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman-image-prune` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-prune.1.html
- Podman `podman-image-exists` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-exists.1.html

## Issues Found
- The post used `podman untag <tag>` in places where it described removing just one tag from an image that may have multiple names. Podman's documented syntax treats the first argument as the image and removes all names if no name is specified. Updated examples to pass both the image reference or ID and the specific tag name when removing one tag.
- The bulk cleanup scripts untagged by tag name alone, which could remove all names from the underlying image when multiple tags refer to the same image. Updated the scripts to include the image ID in the formatted `podman images` output and call `podman untag "$IMAGE_ID" "${IMAGE}:${TAG}"`.
- The version cleanup script described its comparison as simple string comparison that works for semver. Updated the comment to describe it as numeric version tag comparison, matching the `sort -V` behavior more accurately.
- The registry-qualified example used `--filter reference='*myapp*'`. Podman documents the `reference` filter as accepting regex-style patterns, so this was updated to `--filter reference='.*myapp.*'`.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed directly with `--help`. The review was completed against current official Podman documentation.
