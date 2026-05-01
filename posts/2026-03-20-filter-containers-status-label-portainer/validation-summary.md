# Validation Summary: How to Filter Containers by Status and Label in Portainer - Status Label

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker CLI
- Docker Engine API
- Docker Compose
- Python `requests`

## Sources Consulted
- Portainer documentation, API documentation: https://docs.portainer.io/api/docs
- Portainer documentation, API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer documentation, Containers page: https://docs.portainer.io/2.33-lts/user/docker/containers
- Portainer documentation, View a container's details: https://docs.portainer.io/user/docker/containers/view
- Docker Docs, `docker container ls` / `docker ps`: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs, filter commands: https://docs.docker.com/engine/cli/filter/
- Docker Docs, Compose service labels: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Docker object labels: https://docs.docker.com/engine/manage-resources/labels/

## Issues Found
- The post claimed Portainer's container list directly supports status, stack, and label filters in the UI. Portainer's official docs only document a search box on the Containers page and label visibility in container details, so the UI section was corrected to match documented behavior.
- The Docker CLI example described `com.docker.compose.project` as a generic stack-name filter. Docker documents this as a canonical Compose project label, so the example text was corrected to refer to the Compose project name.
- The label-only `docker ps` examples were described as finding "all" matching containers, but `docker ps` lists only running containers by default. The example comments were corrected to say "running" containers.
- The Portainer API example filtered only by label and relied on `all=false` for running containers. It was updated to use Docker-compatible JSON-encoded `filters` for both `status` and `label` through Portainer's Docker API proxy, which is the documented Portainer API behavior.
- The summary overstated Portainer UI capabilities. It was revised to distinguish Portainer's list search/details view from exact filtering done through Docker CLI or the Portainer API.

## Review Notes
- The custom label keys in the Compose example are valid. Docker recommends reverse-DNS label names to reduce collisions in shared environments, but simple keys are still supported.
- Portainer documentation does not currently spell out detailed Containers-page filter categories, so the post now limits UI claims to behavior that is explicitly documented.
