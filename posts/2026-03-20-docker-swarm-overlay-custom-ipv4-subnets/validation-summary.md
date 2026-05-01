# Validation Summary: How to Set Up Docker Swarm Overlay Networking with Custom IPv4 Subnets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Swarm
- Docker overlay networking
- Docker stack / Compose v3 stack files
- Linux VXLAN inspection and packet capture

## Sources Consulted
- Docker Docs: Manage swarm service networks — https://docs.docker.com/engine/swarm/networking/
- Docker Docs: `docker swarm init` — https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: `docker network create` — https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Deploy a stack to a swarm — https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker stack services` — https://docs.docker.com/reference/cli/docker/stack/services/
- Docker Docs: `docker container ls` / `docker ps` filters — https://docs.docker.com/reference/cli/docker/container/ls/
- Local command help: `ip link help`
- Local command help: `tcpdump --help`

## Issues Found
- The introduction incorrectly described `docker_gwbridge` as an overlay network. I corrected it to a bridge network, which matches Docker's Swarm networking model.
- The post claimed that the default `ingress` network uses `10.0.0.0/24`. Docker documents the ingress subnet as automatically chosen unless you recreate it, so I replaced that fixed-subnet claim with accurate wording and clarified that port-published services must be removed before deleting `ingress`.
- The stack example used `my-api:latest`, which is a placeholder image and would not work as written on a normal Swarm cluster. I replaced it with `nginx:alpine` so the example is runnable.
- The verification commands did not match Swarm stack naming. `docker stack deploy ... myapp` creates services such as `myapp_web`, not `web`, so I updated the commands accordingly and made the `docker exec` lookup target a Swarm task container.
- The VXLAN capture example assumed `eth0` without explanation. I kept the example but added a note that the interface should match the node's Swarm data-path interface.

## Review Notes
- `docker stack deploy` uses the legacy Compose file version 3 format; the post's `version: "3.8"` example remains appropriate for Swarm stack deployment.
