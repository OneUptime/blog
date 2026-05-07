# Validation Summary: How to Prune All Unused Resources with podman system prune

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container storage cleanup
- Shell commands
- Cron automation

## Sources Consulted
- Podman `system prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `container prune` official documentation: https://docs.podman.io/en/v5.0.2/markdown/podman-container-prune.1.html
- Podman `image prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-image-prune.1.html
- Podman `volume prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman `volume ls` official documentation: https://docs.podman.io/en/stable/markdown/podman-volume-ls.1.html
- Podman `network prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-network-prune.1.html
- Podman `system df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html

## Issues Found
- The article said the default `podman system prune` removes stopped containers, unused networks, dangling images, and build cache. Updated this to include stopped pods and to specify dangling build cache, matching the current official warning output and documentation.
- The introduction said `podman system prune` removes all unused resources in one operation. Updated this to "unused resources" because volumes are optional and build containers require `--build`.
- The volume warning said `--volumes` removes unnamed volumes. Updated it to unused volumes, because Podman documents the flag as pruning volumes currently unused by any container.
- The `--all` section said it removes images not associated with a running container. Updated this to images not associated with any container, matching Podman's definition of unused images.
- The dry-run preview counted dangling volumes under a generic "would be pruned" heading. Updated the comment and output label to clarify those volumes are only removed by `system prune` when `--volumes` is used.

## Review Notes
The local environment did not have the `podman` binary installed, so command behavior was verified against official Podman documentation rather than local `--help` output. The remaining shell snippets are syntactically valid and use documented Podman flags and filters.
