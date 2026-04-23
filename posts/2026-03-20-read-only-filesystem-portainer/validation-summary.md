# Validation Summary: How to Run Portainer with Read-Only Root Filesystem - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- tmpfs mounts
- Container filesystem hardening
- Node.js
- Python / FastAPI
- Nginx

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker tmpfs mounts documentation: https://docs.docker.com/engine/storage/tmpfs/
- Docker `diff` CLI reference: https://docs.docker.com/reference/cli/docker/container/diff/
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer container details view: https://docs.portainer.io/user/docker/containers/view
- Portainer container inspect view: https://docs.portainer.io/user/docker/containers/inspect
- Node.js release schedule: https://nodejs.org/en/about/releases/
- Node Docker Official Image tags: https://hub.docker.com/_/node/

## Issues Found
- The Compose example in Step 1 used `size=` inside the service-level `tmpfs` syntax. Docker’s Compose docs only support `mode`, `uid`, and `gid` in that syntax. I rewrote the example to use long-syntax `volumes` entries with `type: tmpfs`, which is the documented way to set both `size` and `mode`.
- The YAML snippets used the top-level `version` field. Docker now documents that field as obsolete and warns when it is present. I removed it from the Compose examples.
- The audit commands in Step 3 assumed `bash`, `apt-get`, and package installation inside an arbitrary application container. That is not generally valid and would often fail. I replaced those commands with `docker diff`, which Docker documents specifically for inspecting filesystem changes in a container.
- The Node.js example used `node:18-alpine`. Node.js 18 is End-of-Life according to the Node.js release schedule. I updated the example to `node:24-alpine`, which is a current supported LTS line and an available official Docker image tag.
- The verification command in Step 5 checked `.HostConfig.Tmpfs`, which matches `--tmpfs` CLI usage but not the corrected Compose long-syntax tmpfs mounts. I updated the verification to inspect `.Mounts` and look for `tmpfs` mount entries.
- The Portainer self-deployment example mounted `/var/run/docker.sock` as `:ro`, which does not match Portainer’s official installation guidance. I changed it to the documented socket mount form.
- The conclusion said Portainer’s detail view shows the security configuration directly. Portainer’s official docs explicitly document inspecting the container configuration through the Inspect view and raw JSON. I adjusted the wording to match that documented capability.

## Review Notes
- The updated Step 1 tmpfs example relies on Compose long-syntax tmpfs options. Docker documents `tmpfs.mode` in long syntax as requiring Docker Compose 2.14.0 or later.
- I did not add new hardening advice beyond the original scope. The post remains focused on read-only root filesystems, tmpfs, and persistent volumes.
- Docker is not installed in this workspace, so I could not re-run the commands locally. Validation was performed against official documentation and authoritative upstream sources.
