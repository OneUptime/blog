# Validation Summary: How to Manage Swarm Node Labels and Constraints in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Engine API
- Compose file deployment syntax for Swarm stacks
- Bash

## Sources Consulted
- Docker CLI reference: `docker node update` https://docs.docker.com/reference/cli/docker/node/update/
- Docker CLI reference: `docker node ls` https://docs.docker.com/reference/cli/docker/node/ls/
- Docker CLI reference: `docker node inspect` https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker CLI reference: `docker service create` https://docs.docker.com/reference/cli/docker/service/create/
- Docker Compose Deploy Specification https://docs.docker.com/reference/compose-file/deploy/
- Docker stack deploy reference https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Swarm services documentation https://docs.docker.com/engine/swarm/services/
- Portainer API documentation landing page https://docs.portainer.io/api/docs
- Portainer API usage examples https://docs.portainer.io/sts/api/examples
- Portainer Swarm details documentation https://docs.portainer.io/2.33-lts/user/docker/swarm/details
- Docker Engine OpenAPI spec (`/nodes/{id}/update`, `NodeSpec`) https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml
- SwarmKit constraint parser source https://raw.githubusercontent.com/moby/swarmkit/master/manager/constraint/constraint.go

## Issues Found
- The Portainer UI path for editing Swarm node labels was inaccurate. It was updated from `Swarm > Nodes > Select Node > Labels` to `Swarm > Details > Select Node > Node Details > Labels` to match Portainer's documented Swarm navigation.
- The Portainer API example for updating node labels was incorrect. Docker's node update API requires the node object's version in the `version` query parameter, not as `Version` inside the JSON body. I added `NODE_VERSION=$(docker node inspect --format '{{.Version.Index}}' worker1)` and changed the request URL to `/update?version=$NODE_VERSION`.
- The section titled `Available Constraint Operators` was technically mislabeled because it listed constraint expressions rather than operators. I renamed it to `Available Constraint Expressions`.
- The conclusion incorrectly referred to `Docker Compose labels in stacks` as the mechanism for service placement. I corrected this to placement constraints in Compose files used for stacks.

## Review Notes
- The Swarm placement examples are valid. Docker's Compose deploy syntax supports `deploy.placement.constraints` and `deploy.placement.preferences`, and `docker stack deploy` supports Compose file version `3.0` and above while using the legacy Compose v3 format for Swarm stacks.
- The spacing used in examples such as `node.labels.environment == production` is acceptable. SwarmKit trims whitespace around `==` and `!=` when parsing constraints.
