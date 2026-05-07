# Validation Summary: How to Use the Podman REST API to Manage Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman libpod REST API
- Container volumes
- `curl`
- Python

## Sources Consulted
- Podman API reference: https://docs.podman.io/en/latest/Reference.html
- `podman volume create` man page: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- `podman volume prune` man page: https://docs.podman.io/en/latest/markdown/podman-volume-prune.1.html
- `podman create` and `--mount` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- `--mount` option reference: https://github.com/containers/podman/blob/main/docs/source/markdown/options/mount.md
- Podman volume API route definitions: https://github.com/containers/podman/blob/main/pkg/api/server/register_volumes.go
- Podman libpod volume handler implementation: https://github.com/containers/podman/blob/main/pkg/api/handlers/libpod/volumes.go
- Podman libpod container create route and `SpecGenerator` model: https://github.com/containers/podman/blob/main/pkg/api/server/register_containers.go
- Podman `SpecGenerator` and named volume model: https://github.com/containers/podman/blob/main/pkg/specgen/specgen.go
- Podman named volume type: https://github.com/containers/podman/blob/main/pkg/specgen/volumes.go
- Podman volume removal behavior: https://github.com/containers/podman/blob/main/libpod/runtime_volume_common.go
- Podman API version compatibility: https://github.com/containers/podman/blob/main/version/version.go

## Issues Found
- The `libpod/containers/create` examples mounted named volumes via the `mounts` array using `type: "volume"`. The libpod create endpoint accepts a `SpecGenerator`, where named volumes are represented by the `volumes` field, so the examples were changed to use `volumes` entries with `name`, `dest`, and `options`.
- The force-delete example implied that `force=true` only removes the volume. Podman force-removes dependent containers when deleting an in-use volume, so the command comment was corrected to reflect that behavior.
- The prune section said the endpoint removes all unused volumes by default. Current libpod behavior removes only unused anonymous volumes unless the `all` filter is set, so the explanation and examples were corrected.
- The Python cleanup example called `prune()` with no filters after creating named volumes. That would not remove the named volumes, so the sample was updated to support prune filters and to prune by label instead.
- The volume overview described Podman volumes as inherently portable. That was softened to avoid overstating what Podman-managed volumes guarantee across hosts.

## Review Notes
The post pins examples to `/v4.0.0/libpod`. Current Podman source still declares `4.0.0` as the minimal supported libpod API version, so the examples remain valid, but servers advertise their current supported version in the `Libpod-API-Version` response header. The Python example now URL-encodes the JSON filter query, which is safer for custom clients even though Podman’s own tests also exercise raw JSON in the query string.
