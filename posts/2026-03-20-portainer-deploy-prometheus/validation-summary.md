# Validation Summary: How to Deploy Prometheus via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / container stacks
- Prometheus
- Prometheus HTTP API
- Prometheus alerting rules
- Prometheus Node Exporter
- cAdvisor

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus management API: https://prometheus.io/docs/prometheus/3.1/management_api/
- Prometheus security model: https://prometheus.io/docs/operating/security/
- Prometheus guide for cAdvisor: https://prometheus.io/docs/guides/cadvisor/
- Official Node Exporter README (containerized deployment guidance): https://github.com/prometheus/node_exporter
- Portainer relative path volume documentation: https://docs.portainer.io/sts/advanced/relative-paths
- Docker Compose services reference (`extra_hosts`, bind mounts): https://docs.docker.com/reference/compose-file/services/
- Docker daemon reference for `host-gateway`: https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The stack used relative bind mounts (`./prometheus.yml` and `./rules`), which is not a generally valid Portainer stack pattern unless you are in specific Git-based Portainer deployments with relative path support. I changed the guide to use explicit Docker host paths under `/opt/prometheus` and updated the surrounding instructions.
- The Prometheus container used `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size` CLI flags. Current Prometheus documentation marks these flags as deprecated in favor of configuration-file retention settings, so I moved retention into `prometheus.yml` under `storage.tsdb.retention`.
- The stack enabled `--web.enable-admin-api` even though the post only uses `/-/reload`, which requires `--web.enable-lifecycle` instead. I removed the admin API flag because it exposes mutating administrative endpoints unnecessarily.
- The Node Exporter container definition did not match the current official container guidance, and Prometheus was configured to scrape `localhost:9100`, which would not reach a host-networked exporter from inside the Prometheus container. I updated Node Exporter to the documented host-monitoring pattern and changed the local scrape target to `host.docker.internal:9100` with an `extra_hosts` mapping.
- The default Prometheus config referenced `alertmanager`, `myapp`, and `blackbox-exporter` targets that were not deployed by the stack shown in the post. I converted those sections into clearly marked optional examples so the default configuration matches the services actually defined in the guide.
- The `query_range` example used `start=now-1h&end=now`, but the Prometheus HTTP API requires RFC3339 or Unix timestamps for `start` and `end`. I replaced the example with a valid `curl -G` command using Unix timestamps.
- The cAdvisor example mounted `/var/run` read-only, while the official guide uses a read-write mount for that path. I updated the mount to `rw` to match the documented deployment pattern.

## Review Notes
- The post now reads as technically correct for a current Docker/Portainer-style deployment, but it still uses `latest` image tags. That keeps the example simple, but it also means behavior can drift over time as new releases are published.
- The alert rules are valid, but production setups often add extra label filters for filesystem alerts to avoid noise from pseudo-filesystems or read-only mounts.
- Docker and `promtool` were not installed in this workspace, so the review relied on official documentation and a manual static check of the updated snippets rather than an executed container-based validation.
