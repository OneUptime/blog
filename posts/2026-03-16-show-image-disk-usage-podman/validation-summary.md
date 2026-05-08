# Validation Summary: How to Show Image Disk Usage with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Container storage
- Shell commands
- awk
- jq

## Sources Consulted
- Podman `system df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `history` documentation: https://docs.podman.io/en/latest/markdown/podman-history.1.html
- Podman `image inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `image prune` documentation: https://docs.podman.io/en/v3.0/markdown/podman-image-prune.1.html
- Podman `system prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html

## Issues Found
- The examples sorted human-readable image and layer sizes with `sort -rh`, which can compare incorrectly when Podman emits sizes with separated units. Changed the largest-image and descending-size examples to sort `.VirtualSize` byte values numerically, and changed the largest-layer example to use `podman history --human=false`.
- The dangling-image space calculation piped human-readable `.Size` values into `bc`, which fails for values like `146 MB`. Changed it to sum `.VirtualSize` byte values with `awk`.
- The virtual-size example used generic `podman inspect`, which can inspect a container instead of an image if names collide. Changed it to `podman image inspect`.
- The monitoring example used `.TotalCount` in `podman system df --format`; the documented Go template placeholder is `.Total`. Updated the template accordingly.
- The cleanup section described `podman image prune -a --filter "until=720h"` as a dry-run command, but the documented command removes matching images. Updated the comment to state that it removes unused images older than 30 days.
- The full cleanup example said it included volumes but used `podman system prune -a`; Podman requires `--volumes` to prune unused volumes. Updated the command to `podman system prune -a --volumes`.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against the current official Podman documentation rather than local `--help` output.
