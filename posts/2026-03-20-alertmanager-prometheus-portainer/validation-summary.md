# Validation Summary: How to Configure Alertmanager with Prometheus via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Docker configs
- Prometheus
- Alertmanager
- PromQL
- node_exporter
- Slack incoming webhooks
- PagerDuty
- SMTP email notifications

## Sources Consulted
- Portainer Configs documentation: https://docs.portainer.io/user/docker/configs
- Docker Swarm configs documentation: https://docs.docker.com/engine/swarm/configs/
- Docker stack deploy documentation: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager client / alerts API documentation: https://next.prometheus.io/docs/alerting/latest/clients/
- Alertmanager management API documentation: https://prometheus.io/docs/alerting/latest/management_api/
- Alertmanager high availability documentation: https://prometheus.io/docs/alerting/latest/high_availability/
- Node Exporter README (official repository, Docker deployment guidance): https://github.com/prometheus/node_exporter/blob/master/README.md

## Issues Found
- The post described Portainer configs as if they were generally available on any Docker host. I corrected the introduction, prerequisites, and setup text to make clear that Portainer `Configs` are available in Docker Swarm environments.
- The Alertmanager routing example incorrectly implied that `continue: true` on a child route would also send to the root/default receiver. I changed the routing tree so critical alerts are explicitly routed to PagerDuty, email, and Slack, matching Alertmanager's documented route traversal behavior.
- The Alertmanager route example used deprecated `match` keys. I updated them to `matchers`, which is the current documented syntax.
- The inhibition example used deprecated `source_match` and `target_match` keys. I updated them to `source_matchers` and `target_matchers`.
- The Alertmanager container was started with `--cluster.advertise-address=0.0.0.0:9094`, which is inappropriate for the single-instance setup shown and not a valid routable advertise address for HA clustering. I removed that flag.
- The `node-exporter` container configuration was missing the host root filesystem mount and `--path.rootfs` flag needed for containerized host filesystem metrics. I added them so the disk-space alert example aligns with the deployment.
- The reload section was incorrect for Docker Swarm configs, because Swarm configs are immutable and changing them requires creating a new config and redeploying the service or stack. I replaced that section with correct update guidance and clarified when `/-/reload` applies.
- The test alert command used the removed Alertmanager v1 alerts API. I updated it to `POST /api/v2/alerts`.

## Review Notes
- The Prometheus and Alertmanager snippets were syntax-checked with `promtool` and `amtool` from the official `prom/prometheus` and `prom/alertmanager` container images.
- The post still uses `:latest` image tags. This is technically valid, but it makes the tutorial less deterministic over time because image behavior can change without the post changing.
