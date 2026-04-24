# Validation Summary: How to Configure Service Resource Limits in Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker services
- Docker Compose Deploy Specification
- Linux OOM killer

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker `service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker `service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Swarm services documentation: https://docs.docker.com/engine/swarm/services/
- Docker resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Docker `container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker `system events` reference: https://docs.docker.com/reference/cli/docker/system/events/
- Docker Engine API reference showing `State.OOMKilled`: https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker Compose byte-value syntax reference: https://docs.docker.com/reference/compose-file/extension/
- Portainer add service documentation: https://docs.portainer.io/user/docker/services/add
- Portainer service options documentation: https://docs.portainer.io/user/docker/services/configure
- Portainer service task status documentation: https://docs.portainer.io/user/docker/services/tasks
- Portainer container details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer container statistics documentation: https://docs.portainer.io/sts/user/docker/containers/stats

## Issues Found
- The scheduler example in Step 6 was mathematically incorrect: a node with 2 CPU available cannot place a task reserving 3 CPU. I corrected the result to show that the task remains pending.
- The `docker stats --no-stream` example was described as giving "average stats over time", but it returns a one-time snapshot. I corrected the description.
- The memory reservation example comment said `128M` was "slightly above average" for a service that normally uses `200MB`. I corrected the explanation to reflect that `128M` is about 64% of normal usage, which matches the post's stated reservation rule of thumb.
- The OOM section treated exit code `137` as if it uniquely identified an OOM kill. Docker documents `137` as `SIGKILL`, which can also be caused by manual kills or daemon restarts. I corrected the text to say `137` is a common OOM symptom but `.State.OOMKilled` is the reliable confirmation.
- The Portainer monitoring steps skipped the fact that selecting a service task opens that task's container details page before the Stats view. I clarified the navigation to match Portainer's documentation.
- The Step 7 heading said limits could be adjusted "Without Redeployment", but `docker service update` applies changes by replacing tasks when required. I corrected the heading and explanation to describe this as a rolling service update.

## Review Notes
- The Compose example is valid for Swarm-style deployment and uses supported `deploy.resources` fields. Docker notes that Swarm stack deployment still uses the legacy Compose v3-style format, so readers should treat this as a Swarm/stack example rather than a generic `docker compose up` example.
