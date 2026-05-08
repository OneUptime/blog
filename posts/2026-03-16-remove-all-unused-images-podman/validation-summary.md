# Validation Summary: How to Remove All Unused Images with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Container storage cleanup
- Bash
- Cron

## Sources Consulted
- Podman `podman-image-prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-image-prune.1.html
- Podman `podman-system-prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `podman-ps` official documentation: https://docs.podman.io/en/stable/markdown/podman-ps.1.html
- Podman `podman-images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman-system-df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html

## Issues Found
- The initial image comparison used container image names and `podman images` repository tags while describing all local images. That can miss matches when image names are normalized differently, and `podman images` does not include all intermediate or dangling images by default. I changed the example to compare full image IDs with `podman ps -a --no-trunc --format "{{.ImageID}}"` and `podman images -a --no-trunc --format "{{.Id}}"`.
- The `podman image prune -a --filter "until=0h"` example was described as a way to see what would be removed before removing it, but Podman does not document this as a dry-run option and the command still prunes matching images. I replaced it with a non-destructive listing command using `podman images -a --format` and the documented `.Containers` placeholder.
- The `podman system prune` comment said it removes unused images and build cache. Official documentation says the default command removes dangling images and dangling build cache; `--all` is needed to delete all unused images. I updated the wording.

## Review Notes
Podman was not installed in the local environment, so command behavior was validated against official Podman documentation rather than local `--help` output. The remaining commands and flags matched the documented Podman CLI behavior.
