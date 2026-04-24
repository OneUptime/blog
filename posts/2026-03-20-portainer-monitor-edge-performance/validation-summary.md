# Validation Summary: How to Monitor Edge Device Performance in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Prometheus
- Grafana
- Prometheus node_exporter
- cAdvisor

## Sources Consulted
- Portainer container stats documentation: https://docs.portainer.io/sts/user/docker/containers/stats
- Portainer environment documentation and Endpoints-to-Environments rename note: https://docs.portainer.io/sts/admin/environments
- Portainer host details documentation: https://docs.portainer.io/user/docker/host/details
- Portainer Edge Stacks documentation: https://docs.portainer.io/user/edge/stacks
- Portainer Edge Stack creation documentation: https://docs.portainer.io/user/edge/stacks/add
- Portainer Edge Configurations documentation: https://docs.portainer.io/sts/user/edge/configurations
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference for the remote write receiver: https://prometheus.io/docs/prometheus/latest/querying/api/
- Docker documentation for reaching host services from Prometheus containers with `host.docker.internal` and `host-gateway`: https://docs.docker.com/engine/daemon/prometheus/
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md
- cAdvisor README: https://github.com/google/cadvisor

## Issues Found
- The Portainer navigation path for container stats was inaccurate. The post said `Edge Compute > Environments`, but Portainer documents `Environments` as the management entry point, with `Endpoints` as the older term. I corrected the menu path and container-stats navigation.
- The host-monitoring section overstated what Portainer shows. Portainer documents the `Host` page as Docker Standalone-only host details rather than live host CPU, memory, and disk usage charts. I changed the section to describe `Host > Details` accurately.
- The Prometheus scrape target for node_exporter would not work as written. From inside the Prometheus container, `localhost:9100` points at the Prometheus container itself, not the host-networked node_exporter. I fixed this by adding `host.docker.internal=host-gateway` to the Prometheus service and changing the scrape target to `host.docker.internal:9100`, matching Docker’s documented pattern.
- The alert-rules example was incomplete because Prometheus was not loading the rule file. I fixed this by mounting the config directory instead of a single file and adding `rule_files` to `prometheus.yml` so `/etc/prometheus/alert-rules.yml` is actually read.
- The Prometheus config used environment-variable placeholders in `static_configs.labels` and `remote_write` in places Prometheus does not document for general env expansion. I replaced that approach with `external_labels`, which Prometheus explicitly documents as supporting `${VAR}` expansion, and simplified the `remote_write` example accordingly.
- The central-aggregation section omitted a receiver requirement for Prometheus. I added the requirement to start a receiving Prometheus server with `--web.enable-remote-write-receiver` before using `/api/v1/write`.

## Review Notes
- The pinned container image versions are older than the current upstream releases as of April 24, 2026, but the examples remain structurally valid after the fixes above.
- The disk-space alert is valid, but on hosts with many pseudo-filesystems it may be worth adding filesystem filters later to reduce noisy alerts.
