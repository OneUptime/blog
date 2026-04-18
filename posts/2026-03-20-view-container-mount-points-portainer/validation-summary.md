# Validation Summary: How to View Container Mount Points in Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (UI and API)
- Docker Engine
- Docker CLI (`docker inspect`, `docker volume`)
- Docker Compose (volumes, long-form mount syntax)
- Python `requests` library (Portainer API client)
- `jq`

## Sources Consulted
- Docker CLI reference: `docker inspect` — https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: `docker volume inspect` — https://docs.docker.com/reference/cli/docker/volume/inspect/
- Docker CLI reference: `docker volume ls` — https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker storage overview (volume, bind, tmpfs types) — https://docs.docker.com/engine/storage/
- Docker `--mount` vs `-v` flags — https://docs.docker.com/engine/storage/bind-mounts/
- Docker Compose `volumes` short and long syntax — https://docs.docker.com/reference/compose-file/services/#volumes
- Docker Compose `tmpfs` mount options — https://docs.docker.com/reference/compose-file/services/#tmpfs
- Docker Engine API `GET /containers/{id}/json` (Mounts, HostConfig.Binds, HostConfig.Mounts) — https://docs.docker.com/reference/api/engine/
- Portainer container details / Volumes section documentation — https://docs.portainer.io/user/docker/containers
- Portainer API access via endpoint Docker proxy (`/api/endpoints/:id/docker/`) — https://docs.portainer.io/api/access

## Issues Found
The submitted post was severely mismatched with its title and tags. The title, description, and tags described inspecting container **mount points** (volumes, bind mounts, tmpfs), but the body content was entirely about **filtering containers** by status and labels. None of the original body discussed mounts, volumes, `docker inspect .Mounts`, `docker volume`, or Portainer's Volumes section.

Fix: Rewrote the body of the post so it actually teaches how to view container mount points, while preserving the original title, author, tags, description, and section structure (UI, Docker CLI, Declaring Mounts, Portainer API, Summary) used by sibling posts in this series. Specifically:

- **Using the Portainer UI**: Replaced the filtering walkthrough with a walkthrough of the container details page's Volumes section, the columns shown (Host/Volume, Container path, Type, RW/RO), the volume drill-down view, and the Inspect tab (`Mounts`, `HostConfig.Binds`, `HostConfig.Mounts`).
- **Using the Docker CLI**: Replaced `docker ps --filter` examples with `docker inspect --format '{{json .Mounts}}'`, a Go-template table of mount fields, `docker volume inspect`, `docker volume ls`, and `docker volume inspect --format '{{.Mountpoint}}'`. All template syntax and field names verified against the Docker CLI reference.
- **Declaring Mounts** (replaces the old "Labeling Your Containers" section): Added a Compose example using the short syntax, long-form `type: bind` / `type: tmpfs` syntax with `tmpfs.size`, and the equivalent `docker run -v` / `docker run --mount type=…` commands, all verified against the Compose file specification and Docker Engine storage docs.
- **Using the Portainer API**: Updated the Python example to hit `GET /api/endpoints/1/docker/containers/my-container/json` (the inspect endpoint) and iterate the `Mounts` array, extracting `Type`, `Source` / `Name`, `Destination`, and `RW`, which matches the Docker Engine API response shape.
- **Summary**: Rewrote the summary paragraph to describe mount inspection rather than filtering.

Preserved the original author handle, tags, description, and overall tone/structure. Author voice and section cadence match the sibling `2026-03-20-view-container-port-mappings-portainer` post.

## Review Notes
- The Compose `tmpfs.size` value must be an integer number of bytes (or a string like `"64m"`). The example uses `67108864` (64 MiB) as an explicit byte count, which is unambiguous and avoids version-specific string-parsing differences.
- `docker inspect`'s `.Mounts` is populated for both bind and volume mounts; for `tmpfs` mounts the entry has `Type: "tmpfs"` and typically no `Source`. The Python example falls back to `Name` when `Source` is empty to cover the named-volume case, where Docker's inspect output fills both fields.
- Portainer's Docker proxy requires an environment (endpoint) ID in the path. The example uses `1`, which is the common default for a local endpoint; users with multiple endpoints should substitute their own ID from `GET /api/endpoints`.
- The `-v` short form and the `--mount` long form are both still supported; Docker no longer deprecates `-v` but recommends `--mount` for clarity, which is why both are shown.
