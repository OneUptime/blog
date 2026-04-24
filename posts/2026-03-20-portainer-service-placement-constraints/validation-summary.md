# Validation Summary: How to Configure Service Placement Constraints in Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Compose Deploy Specification

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: `docker service ps` - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: `docker service update` - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: `docker node update` - https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: `docker node inspect` - https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker Docs: `docker node ls` - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Portainer Docs: Services - https://docs.portainer.io/user/docker/services
- Portainer Docs: Add a new service - https://docs.portainer.io/user/docker/services/add
- Portainer Docs: Configure service options - https://docs.portainer.io/user/docker/services/configure
- Portainer Docs: Cluster visualizer - https://docs.portainer.io/user/docker/swarm/cluster-visualizer

## Issues Found
- The original verification command used `docker service ps --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}"`, but Docker documents `.Node` in Go templates as the node ID, while the sample output showed resolved node hostnames. I replaced it with `docker service ps my-service` so the command matches the documented output.
- The original troubleshooting command used `docker node ls --format '{{.Hostname}}: {{.Labels}}'`, but `docker node ls` does not support a `.Labels` placeholder. I replaced it with `docker node inspect --format '{{.Description.Hostname}}: {{json .Spec.Labels}}' $(docker node ls -q)` to correctly display hostnames and Swarm node labels.
- The examples `node.labels.gpu == "true"` and `node.labels.exclude != "true"` used embedded quotes inside the constraint value. I removed the inner quotes to match Docker's documented constraint expression syntax and avoid implying the quotes are part of the label value.
- The Portainer UI reference used `Visualizer`, while current Portainer documentation names the feature `Cluster visualizer`. I updated the wording to match the documented UI name.

## Review Notes
- The post is technically correct after these fixes.
- Docker documents placement preferences as best-effort and notes that preferences are ignored for global services; the post's examples use replicated services, so the guidance remains accurate.
- The Docker CLI was not installed in this workspace, so validation was performed against official Docker and Portainer documentation rather than local command output.
