# Validation Summary: How to Fix Large DockerSnapshotRaw Payloads Slowing Portainer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer CE
- Docker Engine
- Docker CLI
- Docker Compose labels
- BoltDB / bbolt

## Sources Consulted
- Portainer CLI documentation: https://docs.portainer.io/advanced/cli
- Portainer source for snapshot types: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for Docker snapshot creation: https://github.com/portainer/portainer/blob/develop/pkg/snapshot/docker.go
- Portainer source for CLI flag definitions: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source for hidden-container filtering: https://github.com/portainer/portainer/blob/develop/api/http/proxy/factory/docker/containers.go
- Docker CLI reference for `docker system prune`: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker Compose file reference for `labels`: https://docs.docker.com/reference/compose-file/services/#labels
- bbolt README: https://github.com/etcd-io/bbolt/blob/develop/README.md
- bbolt command reference: https://github.com/etcd-io/bbolt/blob/develop/cmd/bbolt/README.md

## Issues Found
- The `DockerSnapshotRaw` description was inaccurate. The post said it included `GET /swarm`, but current Portainer source shows `DockerSnapshotRaw` stores containers, images, networks, volumes, engine `Info`, and engine `Version`. I corrected the list and softened the wording from "full output of" to "data fetched from Docker APIs such as" so it stays accurate.
- The bbolt example comment was incorrect. `bbolt info` prints basic database info, not bucket sizes. I replaced it with a `bbolt stats` example and switched to the official `go.etcd.io/bbolt/cmd/bbolt` entrypoint.
- The `docker system prune -af` explanation overstated what the command removes. I corrected the description to match Docker's documentation and added the `--volumes` caveat for anonymous volumes.
- The `--snapshot-interval 300` example was invalid for current Portainer. The flag expects a duration string like `10m`, and Portainer's default is already `5m`. I updated the explanation and command accordingly, and made the restart examples reuse the image tag from the existing `portainer` container.
- The `--compact-db` example was misleading. In current Portainer, `--compact-db` triggers database compaction on startup; it is not a one-shot maintenance command that compacts and exits. I corrected the text and restart flow.
- The `--hide-label` section incorrectly claimed the flag removes containers from Portainer's snapshot. Current Portainer documentation and source show it hides containers in the UI/container-query path. I updated the section to state that it does not reduce `DockerSnapshotRaw`.

## Review Notes
- Commands assume a standalone Portainer container named `portainer` using the standard `portainer_data` volume.
- The revised restart commands preserve the currently running Portainer image via `docker inspect`, which avoids accidental upgrades during maintenance.
