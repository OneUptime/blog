# Validation Summary: How to List Volumes with Podman

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Podman
- Podman volumes
- Podman CLI filtering and formatting
- Bash scripting

## Sources Consulted
- Podman volume ls documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman volume inspect documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman ps documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman system df documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman source for volume ls/list alias: https://raw.githubusercontent.com/containers/podman/main/cmd/podman/volumes/list.go

## Issues Found
- The introduction said volumes could be filtered by "status". Podman volume listing supports filters such as `dangling`, `driver`, `label`, `name`, `opt`, `scope`, `after/since`, and `until`, but not `status`. Changed this wording to "usage" to match the `dangling` usage examples in the post.
- The single-container inspect example iterated over all mounts and could print bind or other non-volume mounts with empty or misleading names. Added the same `.Type == "volume"` guard used in the later script so the command reports only volume mounts.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed locally. The review was completed against official Podman documentation and Podman source. The post uses `podman volume list`; current Podman source defines `list` as an alias for the documented `podman volume ls` command.
