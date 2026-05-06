# Validation Summary: How to Clean Up Stale Data in the Portainer Database

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker Engine CLI
- Bash
- BoltDB / bbolt

## Sources Consulted
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer backup contents FAQ: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer database documentation: https://docs.portainer.io/sts/advanced/db-encryption
- Portainer source: endpoint list handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_list.go
- Portainer source: endpoint delete handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_delete.go
- Portainer source: stack list handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_list.go
- Portainer source: stack delete handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_delete.go
- Portainer source: API types and status enums: https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go
- Docker CLI reference: `docker system prune`: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI reference: `docker volume prune`: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI reference: `docker builder prune`: https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker logging driver overview: https://docs.docker.com/engine/logging/configure/
- Docker `json-file` logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- bbolt README: https://github.com/etcd-io/bbolt
- bbolt compact command source: https://raw.githubusercontent.com/etcd-io/bbolt/main/cmd/bbolt/command/command_compact.go

## Issues Found
- The Portainer API examples used `Authorization: Bearer` for an API token. Portainer’s access-token documentation uses the `X-API-Key` header, so the examples were updated to use `API_KEY` and `X-API-Key`.
- The endpoint status comments described `Status == 2` as stale/disconnected. In Portainer’s current types it represents a down environment, so the text was corrected to tell readers to review down endpoints before deleting them.
- The stack example omitted `EndpointId` from the listing and omitted the required `endpointId` query parameter on `DELETE /api/stacks/{id}`. The example was updated to capture `EndpointId` and include it in the delete request.
- The stack-status explanation was incomplete and the note implied inactive stacks were leftover deleted Compose records. Portainer’s current status enum is `1=Active`, `2=Inactive`, `3=Deploying`, `4=Error`, and inactive means intentionally stopped, so the wording was corrected.
- The Docker volume-prune example used `docker volume prune -f` while describing removal of all unused volumes. Current Docker documentation says that without `-a`, it only removes anonymous volumes, so the command was updated to `docker volume prune -a -f` where the text described named and anonymous volume cleanup.
- The `docker system prune -a -f --volumes` comment implied it was equivalent to all prior cleanup commands. Docker’s current CLI reference documents `--volumes` there as pruning anonymous volumes, so the description was narrowed accordingly.
- The compaction example tried to download a nonexistent standalone `bbolt` release binary from GitHub. It was replaced with the official `go install go.etcd.io/bbolt/cmd/bbolt@latest` workflow inside a container, which matches upstream installation guidance and the current compact command implementation.
- The weekly cleanup script truncated files under `/var/lib/docker/containers`. Docker’s `json-file` logging-driver documentation warns that these files are meant to be exclusively accessed by the Docker daemon, so that step was replaced with guidance to use Docker log rotation instead.
- The monitoring script placed the alert code after an infinite loop, making it unreachable. The alert check was moved inside the loop.

## Review Notes
- The examples still assume the Portainer container is named `portainer` and that its persistent data is mounted at `/data`; users with different container names or deployment layouts will need to adjust those values.
- The weekly automation example remains intentionally conservative for images and volumes unless readers widen the prune commands themselves.
