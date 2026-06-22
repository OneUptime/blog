# Validation Summary: Docker CPU & Memory Limits: Prevent Container Resource Exhaustion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Linux cgroups / container resource constraints
- CPU and memory limits

## Sources Consulted
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: docker container stats - https://docs.docker.com/reference/cli/docker/container/stats/

## Issues Found
- The Docker Compose examples used top-level `version` keys (`version: '3.8'` and `version: '2.4'`). Docker's current Compose Specification marks the top-level `version` property as obsolete and says Compose always uses the most recent schema regardless of that field. I removed the `version` lines from both examples.
- The note described `deploy` as requiring Compose file version 3+ and being primarily for Swarm mode. Current Docker documentation presents `deploy.resources` as part of the Compose Deploy Specification, while also documenting service-level options such as `mem_limit`, `mem_reservation`, `cpus`, and `cpu_shares`. I updated the note to reflect modern Compose behavior without changing the surrounding structure.

## Review Notes
The Docker CLI flags and explanations for `--memory`, `--memory-reservation`, `--memory-swap`, `--oom-kill-disable`, `--cpu-shares`, `--cpus`, `--cpu-period`, `--cpu-quota`, `--cpuset-cpus`, and `docker stats --no-stream` were consistent with Docker's official documentation. The workload sizing table is general guidance rather than a strict Docker behavior claim, so it was left unchanged.
