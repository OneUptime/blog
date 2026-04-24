# Validation Summary: How to Set Up Global Services (DaemonSet Equivalent) in Portainer on Swarm

## Status
validated

## Post Type
Tutorial / how-to guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker stack deployment with Compose v3 syntax
- Prometheus Node Exporter
- Portainer Agent
- cAdvisor

## Sources Consulted
- Docker Docs, Deploy services to a swarm: https://docs.docker.com/engine/swarm/services/
- Docker Docs, Use Swarm mode routing mesh: https://docs.docker.com/engine/swarm/ingress/
- Docker Docs, Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, `docker service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs, `docker service ps`: https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs, `docker node ls`: https://docs.docker.com/reference/cli/docker/node/ls/
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, Install Portainer Agent on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/agent
- Prometheus `node_exporter` README: https://github.com/prometheus/node_exporter
- Grafana Loki docs, Promtail deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/stages/cri/
- cAdvisor running guide: https://github.com/google/cadvisor/blob/master/docs/running.md
- Falco docs, Deploy as a container: https://falco.org/docs/setup/container/

## Issues Found
- The intro and metadata overstated Swarm behavior as running on every node. Docker documents global services as running one task on every available node that meets placement constraints and resource requirements, so I updated the wording to refer to eligible or available nodes.
- The Node Exporter example used an outdated image reference and an outdated filesystem exclusion flag. I updated it to `quay.io/prometheus/node-exporter:latest`, added `--path.rootfs=/rootfs`, and replaced `--collector.filesystem.ignored-mount-points` with the current `--collector.filesystem.mount-points-exclude` flag from the upstream project.
- The Promtail example was outdated and incomplete. Grafana documents Promtail as deprecated, in LTS through February 28, 2026, and EOL on March 2, 2026. The stack also depended on an external config volume that the post never created or populated, so the paste-and-deploy example would not work as written. I removed the concrete Promtail service and kept the logging use case generic.
- The Portainer Agent example was incomplete for Swarm. Current Portainer/agent documentation requires the agent cluster to join via `AGENT_CLUSTER_ADDR`, and Portainer’s docs require reachability on port `9001`. I added `AGENT_CLUSTER_ADDR: tasks.portainer-agent:9001`, published port `9001` in host mode, and marked the agent as a legacy option to match current Portainer guidance.
- The cAdvisor image reference was outdated. Current upstream docs use `ghcr.io/google/cadvisor` for current releases, so I updated the image and corrected the host-mode comment to describe bypassing the routing mesh rather than "avoiding port conflicts."
- The Falco example was not viable in Swarm as written. Falco’s official container docs require privileged-style host access, while Docker’s Swarm service CLI/reference does not provide a `--privileged` service option. I removed the Falco service from the paste-and-deploy stack rather than leaving a non-working example.
- The health-check section used an invalid recovery command. Adding `--constraint-add node.id==$NODE` to a global service would change placement for the whole service instead of restarting a single task on one node. I replaced it with a supported node-specific inspection command and the supported service-wide rolling restart command `docker service update --force`.

## Review Notes
- `docker stack deploy` still uses the legacy Compose file version 3 format, so retaining `version: '3.8'` is acceptable for a Swarm-targeted stack.
- The examples still use `:latest` tags. This is technically valid, but pinning versioned tags or digests would make the tutorial more reproducible.
- Portainer’s current documentation recommends the Edge Agent for most new Portainer-managed Swarm environments; the post now labels the Portainer Agent example as a legacy option.
