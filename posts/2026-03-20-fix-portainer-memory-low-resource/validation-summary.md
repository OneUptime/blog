# Validation Summary: How to Fix Portainer Memory Issues on Low-Resource Hosts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Engine
- Docker Compose and Docker Swarm resource limits
- Go runtime garbage collection
- Linux swap management

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Docker installation guide: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker `docker stats` CLI reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Go runtime environment variables: https://go.dev/pkg/runtime/?m=old

## Issues Found
- The post said Portainer's default snapshot interval is 60 seconds. Updated it to 5 minutes to match Portainer's documented defaults.
- The `--snapshot-interval` example used `300`, but Portainer expects a duration string parsed by Go's duration format. Updated it to `5m`.
- The snapshot-interval example said to restart Portainer but only showed a new `docker run` command, which would fail if a `portainer` container already existed. Added `docker stop` and `docker rm` before recreating the container.
- The `GOGC` example omitted Portainer's normal socket mount, data volume, restart policy, and published port, so it would not work as a usable Portainer deployment. Added the required runtime options and clarified that the container must be recreated.
- The memory-limit comment implied the container would automatically OOM-restart. Reworded the comment to describe memory capping without assuming a restart policy.
- The Edge Compute section implied a documented performance benefit from disabling Edge Compute. Reworded it to the narrower, documented guidance to avoid enabling Edge Compute features when they are not used.
- The opening paragraph overstated behavior on low-resource hosts. Softened it to a technically defensible statement about OOM risk.

## Review Notes
- Modern Portainer installs default to HTTPS on port `9443`; port `9000` is mainly retained for legacy HTTP access when explicitly published.
- Go also supports `GOMEMLIMIT` as a soft runtime memory limit. That could be a future enhancement to this post, but the revised `GOGC` guidance is technically correct.
