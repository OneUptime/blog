# Validation Summary: How to Set Up Docker Container Resource Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Linux cgroups
- CPU, memory, swap, and block I/O resource controls

## Sources Consulted
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: docker container stats CLI reference - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: Runtime metrics and cgroups - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help output for `docker run`, `docker compose config`, and `docker compose up`.

## Issues Found
- The Docker Compose examples used the obsolete top-level `version: '3.8'` field. Removed it from all Compose snippets because current Compose always uses the latest schema and warns that `version` is obsolete.
- The Compose reservation comments described reservations as a guaranteed minimum. Reworded them to describe reserved capacity for supported platforms and scheduler placement, which matches the Compose Deploy Specification more closely.
- The cgroup inspection commands used cgroup v1-only paths. Updated the main examples to cgroup v2 paths and added cgroup v1 equivalents for compatibility.
- The OOM best-practice note said a killed container restarts unconditionally. Reworded it to clarify that restart requires a restart policy.

## Review Notes
The Docker CLI flags shown for memory, swap, CPU shares/quota, cpuset, block I/O limits, `docker stats`, OOM handling, and event inspection are current and valid. The Compose YAML snippets were revalidated with `docker compose config -q` after the edits.
