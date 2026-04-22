# Validation Summary: How to Scale Individual Microservices in Portainer - A Practical Guide

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Docker Compose / stack deploy files
- Docker Engine API
- Traefik v3 Swarm provider
- Prometheus HTTP API and PromQL
- Shell scripting with curl, jq, bc, and cron
- Third-party Docker Swarm autoscaling

## Sources Consulted
- Portainer scale service documentation: https://docs.portainer.io/user/docker/services/scale
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API usage examples and Docker API gateway documentation: https://docs.portainer.io/api/examples
- Docker Engine API reference for service update payloads: https://docs.docker.com/reference/api/engine/version/v1.54/
- Docker service scale CLI reference: https://docs.docker.com/reference/cli/docker/service/scale/
- Docker service update CLI reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker stack deploy CLI reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Traefik v3.0 Swarm provider documentation: https://doc.traefik.io/traefik/v3.0/providers/swarm/
- Traefik v3.0 dashboard documentation: https://doc.traefik.io/traefik/v3.0/operations/dashboard/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Docker Hub listing for vayzer/swarm-autoscaler: https://hub.docker.com/r/vayzer/swarm-autoscaler
- Docker Hub API lookup for orbica/docker-autoscaler: https://hub.docker.com/v2/repositories/orbica/docker-autoscaler/

## Issues Found
1. **Portainer UI flow was inaccurate for current docs**: Updated the manual scaling steps to use the documented scale action from the Services list and the tick icon, instead of describing a generic service edit page and Apply changes button.

2. **Traefik v3 Swarm provider flags were wrong**: Replaced `--providers.docker.swarmMode=true` and related Docker provider flags with `--providers.swarm.*` flags, which match the Traefik v3 Swarm provider documentation.

3. **Traefik example exposed an unused dashboard port**: Removed the `8080:8080` port mapping because the example does not enable Traefik's dashboard/API.

4. **Traefik network name could be wrong after stack deployment**: Added `name: app_overlay` to keep the overlay network name stable, so `--providers.swarm.network=app_overlay` resolves to the intended Docker network instead of a stack-prefixed name.

5. **Portainer API example sent the wrong Docker API body**: Changed the update request to send the Docker service `Spec` object, not the full service inspection object. Also extracted the service version explicitly, introduced `ENDPOINT_ID`, removed the unused `STACK_ID`, and quoted JSON processing correctly.

6. **Docker service CLI prerequisite was missing**: Added a note that the `docker service` scaling commands must be run on a Swarm manager node, matching Docker's cluster management command requirements.

7. **Autoscaling script used fragile replica detection**: Replaced `docker service ls ... | cut` with `docker service inspect` so the script reads the desired replica count directly from the service spec. Added a default value when the Prometheus query returns no samples.

8. **Cron command overwrote existing crontab entries**: Changed the cron installation example to preserve existing entries before adding the autoscaler schedule.

9. **Third-party autoscaler example referenced a non-existent image/configuration**: The `orbica/docker-autoscaler` Docker Hub repository was not found. Replaced it with the documented `vayzer/swarm-autoscaler` image and its supported environment variables, and added the required `swarm.autoscale` labels to the example service.

10. **Monitoring and conclusion had overbroad claims**: Changed the service logs note so it does not imply Docker scale events appear in application logs. Reworded the conclusion to avoid claiming Swarm always distributes replicas across nodes or that per-replica resource limits cap total service usage.

## Review Notes
- The example still uses placeholder application images and a placeholder database URL; readers must replace those with real images and service endpoints.
- The Prometheus CPU query assumes cAdvisor-style Docker Swarm labels. Metric names and labels can differ depending on the collector and scrape configuration.
- The top-level Compose `version` field is still accepted by `docker stack deploy`, but modern Docker Compose treats it as obsolete and informational.
- Mounting `/var/run/docker.sock` into Traefik or an autoscaler grants powerful Docker API access. Production deployments should restrict or proxy Docker API access where possible.
