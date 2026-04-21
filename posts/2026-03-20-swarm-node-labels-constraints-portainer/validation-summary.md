# Validation Summary: How to Manage Swarm Node Labels and Constraints in Portainer - Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Docker node labels
- Swarm placement constraints and preferences
- Docker stack / Compose YAML

## Sources Consulted
- Docker Docs: `docker node update` CLI reference - https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: `docker node ls` CLI reference - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Docs: `docker node inspect` CLI reference - https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: `docker stack deploy` CLI reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Portainer Documentation: Docker/Swarm/Podman Swarm Details - https://docs.portainer.io/sts/user/docker/swarm/details

## Issues Found
- Portainer navigation was inaccurate for the current Portainer documentation. Changed **Swarm > Nodes** to **Swarm > Details**, then selecting a node from the Nodes section, because the current Portainer Swarm Details page contains the Nodes list and node overview.
- The `docker node ls` examples used `--filter label=...`, which filters Docker Engine daemon labels, not Swarm node labels. Changed both examples to use `--filter node.label=...`, which is the documented filter for Swarm node labels.
- The Docker CLI examples did not state that `docker node` commands must be run from a swarm manager node. Added that caveat and clarified that automated `docker node update` calls need manager access.

## Review Notes
The placement constraint and placement preference YAML is technically valid for Swarm stack deployment. The `version: "3.8"` field is still consistent with `docker stack deploy`, which uses the legacy Compose file version 3 format, even though modern Docker Compose treats the top-level `version` field as obsolete for regular Compose workflows.
