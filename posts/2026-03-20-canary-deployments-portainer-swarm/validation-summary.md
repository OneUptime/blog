# Validation Summary: How to Implement Canary Deployments with Portainer on Swarm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Traefik
- Prometheus
- Bash

## Sources Consulted
- Docker CLI reference: `docker swarm init` - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker CLI reference: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Swarm networking and service discovery - https://docs.docker.com/engine/swarm/networking/
- Docker CLI reference: `docker service scale` - https://docs.docker.com/reference/cli/docker/service/scale/
- Docker CLI reference: `docker service update` - https://docs.docker.com/reference/cli/docker/service/update/
- Traefik Swarm provider docs - https://doc.traefik.io/traefik/v3.0/providers/swarm/
- Traefik Swarm routing reference - https://doc.traefik.io/traefik/master/reference/routing-configuration/other-providers/swarm/
- Traefik services and weighted routing docs - https://doc.traefik.io/traefik/v3.4/routing/services/
- Traefik provider namespaces overview - https://doc.traefik.io/traefik/v3.5/reference/install-configuration/providers/overview/
- Prometheus Docker Swarm guide - https://prometheus.io/docs/guides/dockerswarm/
- Prometheus configuration reference - https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions reference - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API reference - https://prometheus.io/docs/prometheus/latest/querying/api/
- Portainer services docs - https://docs.portainer.io/user/docker/services
- Portainer scale-service docs - https://docs.portainer.io/user/docker/services/scale

## Issues Found
- The original Traefik configuration used deprecated Docker-provider Swarm flags for Traefik v3 (`--providers.docker.swarmMode=true` and related `providers.docker.*` options). I replaced them with the current Swarm provider flags from the Traefik v3 docs and enabled the file provider for weighted routing.
- The post originally claimed that running `9` stable replicas and `1` canary replica would automatically make Traefik send about 10% of traffic to the canary. That is not how Traefik routes across separate Swarm services. I corrected the explanation and added a weighted Traefik service configuration, which is the documented way to split traffic between services.
- The stable and canary services originally tried to share the same Traefik router/service labels directly. I changed the labels so the stable router points to a weighted file-provider service, while the stable and canary backends are registered separately for Traefik.
- The setup referenced `traefik_overlay` as an external network but never created it. I added the missing network creation step.
- The promotion script called an undefined `check_error_rate` function and compared a potentially non-integer Prometheus value with shell integer operators. I replaced that with calls to the health-check script and updated the rollout logic accordingly.
- The promotion script updated the stable service image but then scaled the canary to zero without restoring the stable replica count to `10`, which would reduce capacity. I fixed the final promotion flow so stable returns to `10` replicas before traffic is fully moved off canary.
- The Prometheus example used DNS discovery against `tasks.app_stable` and `tasks.app_canary`, which was brittle for a stack deployment and did not align with Prometheus' Swarm discovery guidance. I replaced it with `dockerswarm_sd_configs` plus relabeling.
- The Prometheus error-rate query divided unaggregated vectors and the latency query used `histogram_quantile()` without the required `sum by (le)` aggregation for classic histograms. I corrected both queries based on Prometheus' query docs.
- The Prometheus check script used `http://prometheus:9090`, which would not resolve from a host-side shell script. I changed it to `http://127.0.0.1:9090` because the Prometheus service is published on port `9090`.
- The rollback flow only scaled the canary service to zero, which could leave the weighted Traefik config still pointing at the canary backend. I updated rollback handling to restore the weighted config to stable-only traffic.

## Review Notes
- The corrected approach assumes the single-manager flow implied by `docker swarm init` in the post. In a multi-manager Swarm, the file-provider config under `/opt/traefik/dynamic` would need to be distributed consistently to every Traefik instance.
- The Prometheus queries assume the application exports metrics such as `http_requests_total` with a `status` label and `http_request_duration_seconds_bucket`. If the app uses different metric names or labels, the example queries must be adjusted.
