# Validation Summary: How to Set Up Stack-Level Resource Constraints in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose / Compose Specification
- Docker Engine CPU, memory, and swap constraints
- Docker CLI `docker stats`

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker CLI `docker container stats` reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Portainer add a new stack documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer container statistics documentation: https://docs.portainer.io/sts/user/docker/containers/stats

## Issues Found
- The description claimed the post covered I/O resource constraints, but the examples only configure CPU and memory. Changed the description to CPU and memory.
- The introduction and summary implied stack-wide enforcement. Docker Compose resource settings are defined per service/container, so the wording was changed to per-service resource management.
- The first Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it because current Compose treats `version` as only informative and warns that it is obsolete.
- The total budget table listed a Redis CPU reservation of `0.1`, but the Redis service snippet did not define that reservation. Added `cpus: "0.1"` under Redis reservations.
- The summary described reservations as universally guaranteed minimums. Adjusted the wording to note that reservations should be used where the deployment mode supports them.

## Review Notes
- The `mem_limit` and `memswap_limit` example is correct for Docker Compose service configuration; setting the swap limit equal to the memory limit prevents container swap access when memory is set.
- The `cpu_shares` example is correctly described as relative priority under CPU contention, while `cpus` is the hard CPU cap.
- The `docker stats --format` placeholders are valid according to the official Docker CLI reference. Local CLI verification was not possible because Docker is not installed in this workspace.
