# Validation Summary: How to Use uidmap and gidmap with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- UID and GID mappings
- Bind mounts and container file permissions

## Sources Consulted
- Podman `podman-run(1)` documentation for `--uidmap`, `--gidmap`, and `--userns`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-container-inspect(1)` documentation for inspect format behavior: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman container unit documentation for rootless intermediate IDs, `@` host ID references, and UIDMap/GIDMap behavior: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html

## Issues Found
- The post described the mapping format as `container_id:host_id:size` in all cases. Podman documents the second field as a direct host ID for rootful users, but as an intermediate ID in rootless mode. Updated the wording and syntax comments to use `from_id` and explicitly mention the rootless intermediate namespace.
- The volume-permissions example claimed `--uidmap 33:0:1` maps container UID 33 to host UID 1000. In rootless mode, `0` maps to the current user's host UID, not arbitrary host UID 1000. Updated the example text to say "your UID" / "your host UID."
- The isolation examples used mappings that either assumed direct host IDs in rootless mode or reused intermediate ID 0 for both containers. Updated the examples to use non-overlapping subordinate ranges and changed the explanatory comment from "completely isolated UID spaces" to "non-overlapping subordinate UID ranges."
- The summary repeated the rootful-only `container_id:host_id:size` framing. Updated it to use `container_id:from_id:size` and "IDs outside the container."

## Review Notes
Podman was not installed in the review environment, so commands could not be smoke-tested locally. The review was performed against official Podman documentation. Current Podman documentation also supports optional mapping flags such as `+`, `u`, `g`, and `@`, but those are beyond the scope of this introductory post.
