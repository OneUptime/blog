# Validation Summary: How to Implement Rolling Updates with Portainer on Swarm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Docker stack / Compose deploy configuration
- Docker service CLI
- Traefik service labels on Swarm

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm services documentation: https://docs.docker.com/engine/swarm/services/
- Docker rolling updates tutorial: https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
- Docker CLI reference for `docker service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Docker CLI reference for `docker service ps`: https://docs.docker.com/reference/cli/docker/service/ps/
- Docker CLI reference for `docker service rollback`: https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker CLI reference for `docker service create` (`--with-registry-auth`): https://docs.docker.com/reference/cli/docker/service/create/
- Portainer documentation for editing and updating stacks: https://docs.portainer.io/sts/user/docker/stacks/edit
- Traefik Swarm routing documentation: https://doc.traefik.io/traefik/master/reference/routing-configuration/other-providers/swarm/

## Issues Found
- The description and `start-first` explanation overstated the guarantee of zero downtime. I changed the wording to match Docker's documented behavior: `start-first` causes old and new tasks to briefly overlap, but true zero downtime still depends on the application starting successfully and remaining healthy.
- The CLI update example used a private-registry image (`myregistry.example.com/...`) but omitted `--with-registry-auth`. I added the flag because Docker documents it for services that need registry credentials propagated to swarm agents.
- The monitoring command was presented as a way to track running replicas, but `docker service ps` shows task history by default. I added `--filter desired-state=running` so the command matches the explanation.
- The `docker service inspect` comment listed only a partial set of possible update states. I replaced it with a generic description that is accurate regardless of the specific state returned.
- The rollback explanation implied that health check failure alone is the direct rollback trigger. I corrected this to Docker's documented rule: an update counts as failed when a task does not start or stops running within the `monitor` window; a failing health check can contribute if it causes the task to be replaced during that period.
- The blue-green example was internally inconsistent because it said green should run in parallel with blue while setting `api-blue` to `replicas: 0`. I changed the example so both services run concurrently and clarified that the Traefik label shown is part of a broader router/service label setup.

## Review Notes
- Commands such as `docker service update`, `docker service ps`, and `docker service rollback` must be run on a swarm manager node.
- The health check example assumes the service image includes `curl`. If it does not, the probe command should be adjusted to use a tool available inside the image.
