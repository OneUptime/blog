# Validation Summary: How to Filter Containers by Status and Label in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Compose
- Portainer API
- `jq`

## Sources Consulted
- Portainer Documentation: Containers overview, https://docs.portainer.io/2.33-lts/user/docker/containers
- Portainer Documentation: View a container's details, https://docs.portainer.io/user/docker/containers/view
- Portainer Documentation: Inspect a container, https://docs.portainer.io/user/docker/containers/inspect
- Portainer Documentation: View container logs, https://docs.portainer.io/user/docker/containers/logs
- Portainer Documentation: View container statistics, https://docs.portainer.io/user/docker/containers/stats
- Portainer Documentation: API documentation, https://docs.portainer.io/api/docs
- Portainer Documentation: API usage examples, https://docs.portainer.io/sts/api/examples
- Portainer source: container query filter types, https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/queries/types.ts
- Portainer source: container list state filter, https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/ListView/ContainersDatatable/columns/state.tsx
- Docker Docs: `docker container ls`, https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs: `docker inspect`, https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker container logs`, https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: `docker container cp`, https://docs.docker.com/reference/cli/docker/container/cp/
- Docker Docs: Docker object labels, https://docs.docker.com/engine/manage-resources/labels/
- Docker Docs: Compose version and name top-level elements, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference (`labels`), https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification (`resources`), https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Engine API `GET /containers/json`, https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker Docs: Engine API version history (`NanoCpus`), https://docs.docker.com/reference/api/engine/version-history/

## Issues Found
- The post implied Portainer's container list can directly filter by labels. I updated the description, introduction, UI steps, and conclusion to distinguish Portainer's state-based list filtering from label-based filtering done via Docker CLI or the Portainer API.
- The prerequisites incorrectly suggested Kubernetes environments are relevant to the Portainer Containers view. I changed this to Docker Standalone or Docker Swarm environments.
- The Compose example used the obsolete top-level `version` field. I removed it, renamed the example to `compose.yaml`, and added explicit container labels so the example matches the post topic.
- The inspect example was valid but not aligned with the current Docker docs. I updated it to use `docker inspect --format='{{json .Config}}'` and added a label-inspection example.
- The Docker logs example used a non-canonical flag order. I changed it to `docker logs --tail 100 container-name`.
- The advanced filter example used a generic label key and the API example did not actually filter. I changed both to use a reverse-DNS label key and updated the Portainer API example to pass Docker `filters` and `all=1`.
- The troubleshooting advice referenced `Settings > Environments > Re-sync`, which I could not verify in current Portainer documentation. I replaced it with a safer refresh instruction.
- The resource-limit verification example focused on `CpuShares` and `CpuQuota`, but Docker's API history documents `NanoCpus` for CPU quota representation. I updated the example to inspect `Memory`, `NanoCpus`, `CpuQuota`, and `CpuPeriod`.

## Review Notes
- Verified against current Portainer documentation and the official Portainer repository as of 2026-05-01.
- Portainer's current container list view clearly exposes a `State` filter in the UI. Label filtering is available through Docker and the Portainer API path shown in the post, but it is not clearly documented as a first-class container-list UI filter.
- The healthcheck example still depends on `curl` being present in the container image; this requirement is now called out inline.
