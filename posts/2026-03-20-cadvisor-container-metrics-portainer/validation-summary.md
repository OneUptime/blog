# Validation Summary: How to Monitor Container Metrics with cAdvisor and Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- cAdvisor
- Portainer
- Docker Compose / Portainer Stacks
- Prometheus
- PromQL
- Grafana

## Sources Consulted
- cAdvisor README: https://github.com/google/cadvisor
- cAdvisor running guide: https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cAdvisor releases: https://github.com/google/cadvisor/releases
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Docker Compose file reference for `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana dashboard 14282 page: https://grafana.com/grafana/dashboards/14282-cadvisor-exporter/

## Issues Found
- The deployment example used the old `gcr.io/cadvisor/cadvisor:v0.47.2` image reference. Current upstream cAdvisor documentation uses `ghcr.io/google/cadvisor` for modern releases, and the old tag was substantially outdated. I changed the image to `ghcr.io/google/cadvisor:v0.55.1` to align the post with current upstream guidance.
- The Compose snippet included a top-level `version: "3.8"` key. Docker now documents the `version` top-level element as obsolete under the current Compose Specification, so I removed it.

## Review Notes
- The Prometheus target `cadvisor:8080` is valid when Prometheus can resolve the `cadvisor` service name, such as when both services run on the same Docker network or in the same Portainer stack.
- cAdvisor `v0.56.x` is newer upstream, but its release notes introduce a Docker 25.0+ support requirement. The post now uses `v0.55.1`, which matches current upstream README examples without adding an unmentioned Docker-version prerequisite.
- Grafana dashboard `14282` exists and is a community dashboard, not an official Grafana-maintained default dashboard.
