# Validation Summary: How to Fix 'Error 500 on Container Recreation' in Portainer - A Practical Guide

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Portainer HTTP API
- Linux system administration utilities (`journalctl`, `ss`, `df`, `free`)
- `jq`

## Sources Consulted
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer upgrade documentation noting the current default HTTPS port (`9443`): https://docs.portainer.io/sts/start/upgrade/docker
- Docker Engine API v1.46 reference: https://docs.docker.com/reference/api/engine/version/v1.46/
- Docker Engine API v1.46 OpenAPI spec: https://docs.docker.com/reference/api/engine/version/v1.46.yaml
- Docker daemon logs documentation: https://docs.docker.com/engine/daemon/logs/
- Docker container logs documentation: https://docs.docker.com/engine/logging/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker daemon configuration overview, including current data-root and containerd image-store paths: https://docs.docker.com/engine/daemon/

## Issues Found
- The introduction stated too definitively that the HTTP 500 came from Docker itself. I changed this to say Portainer usually hits the error while calling the Docker API, which is more accurate because Portainer is acting as the intermediary.
- Step 3 said container name conflicts were "the most common" cause. I changed this to "a common cause" because the docs support the scenario but not that ranking.
- Step 4 used `docker inspect` with `.[0].HostConfig.Mounts`, but Docker's inspect output exposes mounted filesystems under top-level `Mounts`. I corrected the `jq` expression to use `.[0].Mounts`.
- Step 5 only checked `/var/lib/docker` for disk pressure. I added `/var/lib/containerd` because Docker documents that fresh Docker Engine 29+ installs using the containerd image store keep image contents and container snapshots there.
- Step 9 hardcoded `http://localhost:9000` as the Portainer URL. I updated the example to use a `PORTAINER_URL` variable and noted that current Portainer versions default to HTTPS on `9443`, with `9000` only present when HTTP is enabled.
- Step 9 sent the container name in the JSON body. Docker's `POST /containers/create` API takes `name` as a query parameter, so I moved it into the request URL.
- Step 10 said `docker inspect` exported the container's "run command", but the command actually exports the inspect JSON/configuration. I corrected the description.
- The conclusion used overly strong certainty about the source of 500 errors and "most common" causes. I softened that wording to keep it technically defensible.

## Review Notes
- The commands assume a Linux host and, for `journalctl`, a systemd-based distribution.
- The Portainer log command assumes the Portainer container is named `portainer`; that matches Portainer's default install examples but may differ on custom deployments.
- Docker was not installed in this review workspace, so command validation was done against official Docker and Portainer documentation rather than a live CLI.
