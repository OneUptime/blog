# Validation Summary: How to Deploy Loki via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose stacks
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL

## Sources Consulted
- Grafana Loki: Install Loki with Docker or Docker Compose: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki: Install Loki: https://grafana.com/docs/loki/latest/setup/install/
- Grafana Loki: Promtail agent: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki: Log retention: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki: Query Loki metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki: Log queries: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki: Loki HTTP API: https://grafana.com/docs/loki/latest/api/
- Grafana Alloy: Run Grafana Alloy in a Docker container: https://grafana.com/docs/alloy/latest/set-up/install/docker/
- Grafana Alloy: `loki.source.docker`: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/
- Grafana Alloy: `loki.source.file`: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- Grafana Alloy: `loki.write`: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana documentation: Loki data source provisioning: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana documentation: Provision Grafana: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Portainer: How Relative Path Support works in Portainer: https://docs.portainer.io/sts/advanced-topics/relative-paths
- Portainer: Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
- The post deployed Promtail even though Grafana documents Promtail as deprecated and end-of-life as of March 2, 2026. I replaced the Promtail stack service and config section with Grafana Alloy, which is the current recommended log collection agent.
- The stack used relative bind mounts like `./loki-config.yaml`, but Portainer documents relative path support only for Business Edition Git-based deployments with relative path volumes enabled. I changed the example to use explicit host paths under `/opt/loki/`, which works for normal Portainer stack deployments.
- The Loki retention example enabled compactor-based retention without an explicit `delete_request_store`. Current Loki retention and upgrade docs require this to be configured when retention is enabled, so I added `delete_request_store: filesystem` to match the guide’s filesystem-backed storage.
- The Loki container healthcheck used `wget` against `/ready`; Grafana’s Docker Compose examples use `/usr/bin/loki -health`. I updated the healthcheck to the documented container-native form.
- The LogQL metric examples had two correctness issues: `rate(...)` was described as “per minute” even though Loki documents it as per-second, and `count_over_time(... ) by (...)` is not valid aggregation syntax. I corrected the examples to `sum(rate(...))` and `sum by (container_name) (count_over_time(...))`.
- The Grafana provisioning snippet omitted `apiVersion: 1`, which Grafana’s provisioning examples include as the configuration file version. I added it.
- The Grafana data source URL used `http://loki:3100`, which only works when Grafana shares the same Docker network and service DNS scope. Because this section is framed as integrating with an existing Grafana instance, I changed it to `http://<docker-host-ip>:3100`.

## Review Notes
- Filesystem-backed Loki is technically valid for a small self-hosted or evaluation deployment, but Grafana’s storage docs position it as the simplest backend rather than a production-scale recommendation.
- Docker was not available in this workspace, so the review was completed against official documentation and upstream example configurations rather than by launching the stack locally.
