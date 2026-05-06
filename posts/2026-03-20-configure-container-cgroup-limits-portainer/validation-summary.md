# Validation Summary: How to Configure Container Cgroup Limits in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Linux cgroups
- Container CPU, memory, and block I/O resource controls

## Sources Consulted
- Docker Docs: Resource constraints — https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose Deploy Specification — https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: docker stack deploy — https://docs.docker.com/reference/cli/docker/stack/deploy/
- Portainer Docs: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs: Add a new stack — https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- `mem_reservation` was described as a "guaranteed minimum". I changed this to a soft limit applied under contention, which matches Docker's documented memory reservation behavior.
- The production Compose example included `version: "3.8"`. I removed it because current Docker Compose documents the top-level `version` field as obsolete and only retained for backward compatibility.
- The production CPU comment said `cpuset: "0-3"` would "prefer" cores `0-3`. I changed the wording to say it restricts execution to those cores, which is how cpusets work.
- The Portainer UI section claimed the container creation form exposes CPU shares and CPU set controls and implied the same stack YAML guidance applies generally. I corrected this to Portainer's documented Runtime & Resources fields and clarified that the shown Compose settings apply to Docker Standalone stacks, while Docker Swarm uses `deploy.resources` for CPU and memory limits.
- The summary sentence referred broadly to "Portainer stacks". I narrowed it to Docker Standalone hosts so the post no longer overstates compatibility across Portainer deployment targets.

## Review Notes
- Docker documents `blkio` weight controls as applying to direct I/O; buffered I/O is not currently supported for that specific weighting behavior.
