# Validation Summary: How to Configure Service Placement Constraints in Portainer on Swarm (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm
- Docker CLI
- Docker Compose / Compose Deploy Specification
- Portainer
- Swarm service placement constraints

## Sources Consulted
- Docker Docs - Deploy services to a swarm, placement constraints: https://docs.docker.com/engine/swarm/services/#placement-constraints
- Docker Docs - docker service create, service constraints: https://docs.docker.com/reference/cli/docker/service/create/#specify-service-constraints---constraint
- Docker Docs - docker node update, node labels: https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs - Compose Deploy Specification, placement constraints: https://docs.docker.com/reference/compose-file/deploy/#placement
- Docker Docs - docker service ps: https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs - docker service inspect: https://docs.docker.com/reference/cli/docker/service/inspect/
- Docker Docs - docker stack deploy: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs - Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer Docs - Add a new service: https://docs.portainer.io/user/docker/services/add
- Portainer Docs - Placement constraints example for retaining Portainer configuration: https://docs.portainer.io/2.33-lts/faqs/installing/how-can-i-ensure-portainers-configuration-is-retained

## Issues Found
No technical issues found.

## Review Notes
The Docker constraint examples use supported Swarm node attributes and node labels, and multiple constraints are correctly described as an AND match. The `docker node update --label-add`, `docker service ps`, and `docker service inspect --pretty` commands are valid Swarm manager commands. The Compose snippet's `deploy.placement.constraints` structure is correct for Swarm placement constraints. Modern Docker Compose treats the top-level `version` field as obsolete, but Docker's Swarm stack documentation still documents `docker stack deploy` support for legacy Compose file version 3.0 and above, so the `version: "3.8"` example is acceptable in this Swarm context.
