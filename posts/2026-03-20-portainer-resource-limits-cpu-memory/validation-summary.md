# Validation Summary: How to Set Container Resource Limits (CPU and Memory) in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine containers
- Docker CLI
- Docker Compose
- Docker Swarm

## Sources Consulted
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Services top-level element - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker stack deploy` - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: `docker container stats` - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Engine API v1.24 container inspect example (`State.OOMKilled`) - https://docs.docker.com/reference/api/engine/version/v1.24/
- Portainer Docs: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs: View container statistics - https://docs.portainer.io/sts/user/docker/containers/stats

## Issues Found
- The post treated Docker CPU reservations as if `--cpu-shares` guaranteed a minimum amount of CPU. I corrected this to explain that `--cpu-shares` is a relative weight under CPU contention, not a guaranteed reservation, and clarified that Portainer's standalone container UI exposes only maximum CPU usage.
- The post described memory reservations as guaranteed and said they could be equal to the hard limit. I corrected this to match Docker's behavior: `--memory-reservation` is a soft limit activated under host memory pressure and should be lower than the hard memory limit.
- The post presented swap as if it were a current Portainer standalone container form field. I scoped the swap explanation to Docker CLI and Compose, because current Portainer container docs document memory reservation, memory limit, and maximum CPU usage for standalone containers.
- The stack example used `deploy.resources` without distinguishing Swarm from standalone Compose. I clarified that the `deploy` section is for Swarm stacks / implemented deploy targets, and added the correct standalone Compose service-level keys including `mem_reservation`.
- The Portainer navigation and OOM-check examples were slightly off for current documentation. I updated the UI path to `Advanced container settings` > `Runtime & Resources`, aligned the Stats navigation, and replaced the `jq`-based OOM check with Docker's native `--format` output.

## Review Notes
- The Swarm stack example keeps `version: "3.8"` because Docker's `docker stack deploy` continues to use the legacy Compose file version 3 format for Swarm stacks.
- Current Portainer standalone container docs document `Memory reservation`, `Memory limit`, and `Maximum CPU usage`; CPU reservations are documented for Swarm services rather than standalone containers.
