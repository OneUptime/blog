# Validation Summary: How to Self-Host a Monitoring Stack with Portainer - Self Host

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Prometheus
- cAdvisor
- Node Exporter
- Grafana
- OneUptime health checks

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` and `name` elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`extra_hosts`, `network_mode`, `ports`, implicit networks): https://docs.docker.com/reference/compose-file/services/
- Docker daemon `host-gateway` documentation: https://docs.docker.com/reference/cli/dockerd/#configure-host-gateway-ip
- Docker Desktop host connectivity documentation: https://docs.docker.com/desktop/features/networking/networking-how-tos/#connect-to-the-host
- cAdvisor upstream README and Docker quick start: https://github.com/google/cadvisor
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Node Exporter upstream README Docker guidance: https://github.com/prometheus/node_exporter
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus management API: https://prometheus.io/docs/prometheus/latest/management_api/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana Docker configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana Health API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/other/#health-api
- Grafana dashboard 1860, Node Exporter Full: https://grafana.com/grafana/dashboards/1860-node-exporter-full/
- Grafana dashboard 14282, cAdvisor exporter: https://grafana.com/grafana/dashboards/14282-cadvisor-exporter/
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path support documentation: https://docs.portainer.io/sts/advanced-topics/relative-paths

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose treats `version` as only informative and emits an obsolete warning.
- The Prometheus config scraped Node Exporter at `localhost:9100`, but Prometheus runs in its own container while Node Exporter uses `network_mode: host`. Changed the target to `host.docker.internal:9100` and added `extra_hosts: ["host.docker.internal=host-gateway"]` to the Prometheus service so the container can reach the host network endpoint on Linux Docker Engine.
- The Node Exporter container used older-style `/proc` and `/sys` bind mounts and did not set `--path.rootfs`, which can cause filesystem metrics to describe the container rather than the host. Updated it to the upstream Docker pattern with `/:/host:ro,rslave` and `--path.rootfs=/host`.
- The Node Exporter image was changed to `quay.io/prometheus/node-exporter:latest` to match the current upstream Docker example.
- The Node Exporter Prometheus job was named `node-exporter`, but the recommended Grafana dashboard 1860 documents the default job name as `node`. Renamed the job to `node` so the dashboard works with the provided configuration.
- The cAdvisor image used the older `gcr.io/cadvisor/cadvisor:latest` path. Updated it to the current upstream GHCR image path with the latest cAdvisor release available during validation, `ghcr.io/google/cadvisor:0.56.2`.
- The cAdvisor service was missing the upstream quick-start `/dev/kmsg` device and `/dev/disk` bind mount. Added both so disk and kernel-related container metrics match the documented cAdvisor container setup.

## Review Notes
- Docker was not installed in the validation environment, so the stack could not be launched locally. The review was performed statically against official documentation and current upstream examples.
- The `./prometheus.yml` bind mount is valid for a normal Docker Compose deployment when the file is next to the Compose file. In Portainer, users still need to ensure the file is available to the deployment method they choose, such as a Git-backed stack with relative path support, an absolute host path, or an inline Docker config.
- The example publishes Prometheus and Grafana on host ports. On an internet-facing host, these ports should be protected with firewall rules, authentication, or a reverse proxy.
