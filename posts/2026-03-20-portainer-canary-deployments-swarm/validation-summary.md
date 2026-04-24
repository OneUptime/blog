# Validation Summary: How to Implement Canary Deployments with Portainer on Swarm - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Traefik Proxy
- Grafana Loki / LogQL
- Bash

## Sources Consulted
- Traefik v2 to v3 migration details: https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- Traefik Swarm provider reference: https://doc.traefik.io/traefik/v3.3/reference/install-configuration/providers/swarm/
- Traefik Swarm routing reference: https://doc.traefik.io/traefik/master/reference/routing-configuration/other-providers/swarm/
- Traefik HTTP service load-balancing reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- Traefik providers overview and cross-provider namespaces: https://doc.traefik.io/traefik/reference/install-configuration/providers/overview/
- Traefik Swarm advanced guide: https://doc.traefik.io/traefik/expose/swarm/advanced/
- Docker Swarm mode overview: https://docs.docker.com/engine/swarm/
- Docker stack deploy reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker configs in Swarm: https://docs.docker.com/engine/swarm/configs/
- Docker service update reference: https://docs.docker.com/reference/cli/docker/service/update/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer automatic stack updates: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Grafana Loki metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki HTTP API: https://grafana.com/docs/loki/latest/api/

## Issues Found
- The original Traefik example used `--providers.docker.swarmMode=true` with Traefik v3. Traefik v3 split Docker and Swarm into separate providers, and the old `swarmMode` setting is unsupported. I removed that configuration and switched the example to a supported File-provider-based canary setup.
- The original post defined a Traefik weighted service directly through Swarm labels. Traefik’s weighted service type is not supported through Swarm labels in the way shown. I replaced that example with a `canary.yml` File-provider configuration that defines the weighted service correctly.
- The original traffic-shift commands used `docker service update --label-add` to mutate unsupported weighted labels. I changed the rollout flow to update the Traefik canary config and redeploy the stack instead.
- The original rollback example used the same unsupported label-update approach. I corrected the rollback flow to restore the last known-good Traefik config and redeploy.
- The original promotion section suggested simply scaling the stable service to zero and removing it. Because the weighted routing config still referenced the stable backend, that was not a safe or complete promotion flow. I changed it to redeploy with 100% canary traffic first, then remove the old stable service.
- The monitoring section claimed readers should watch response times, but the example only queried Loki for an error-rate-style metric. I corrected the wording so it matches the example shown.
- The database migration wording was tightened so it reflects validation against a shadow database before promoting, instead of implying the shadow test alone is the full deployment step.

## Review Notes
- The post title references Portainer, but the implementation is expressed as Docker CLI equivalents. That is acceptable because Portainer deploys Swarm stacks from Compose files, but the Portainer-specific UI workflow is still only implied rather than shown.
- The corrected example uses `my-stack_api-stable` and `my-stack_api-canary` in `canary.yml`. Readers must replace `my-stack` with their actual stack name.
- The post still uses `traefik:v3.0`. The corrected configuration is valid for Traefik v3, but readers on newer v3 releases should still check current release notes for minor changes.
- Swarm configs are immutable. That is why the corrected rollout notes explicitly call for a new config name when redeploying with changed traffic weights.
