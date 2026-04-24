# Validation Summary: How to Set Up Health Checks for Microservices in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine health checks
- Docker Compose
- Docker Swarm
- Docker Compose restart policies

## Sources Consulted
- Docker Docs, Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Docs, Control startup order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs, Start containers automatically: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs, Deploy to Swarm: https://docs.docker.com/guides/swarm-deploy/
- Docker Docs, Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs, View a container's details: https://docs.portainer.io/user/docker/containers/view

## Issues Found
- The post incorrectly said Docker would restart a container when its health check failed. I updated the restart-policy section to clarify that Docker marks the container `unhealthy` after repeated failures, but restart policies only apply when the container's main process exits.
- The post presented `depends_on: condition: service_healthy` as though it broadly applied to Portainer and Swarm usage. I updated the dependency-ordering section to scope that behavior to Docker Compose on standalone Docker and noted that Swarm stack deployments use the legacy Compose v3 format and do not support that startup ordering.
- The Portainer UI section tied the `starting` health state directly to `start_period` and used version-specific color wording. I normalized that section to the stable Docker health states and corrected the meaning of `starting`: it lasts until the container becomes healthy, while `start_period` only affects how early failures are counted.
- The Compose examples used the top-level `version` field, which current Docker Compose treats as obsolete. I removed it from the examples.

## Review Notes
- The sample probe commands (`curl`, `nc`, `pg_isready`, `mysqladmin`, and `redis-cli`) must exist inside the target image for the health checks to work.
- Swarm health checks are still useful for reporting task health, but they do not provide Compose `depends_on` startup ordering and do not trigger restarts by becoming `unhealthy` on their own.
