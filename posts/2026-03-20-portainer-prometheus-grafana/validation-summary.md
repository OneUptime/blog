# Validation Summary: How to Deploy Prometheus and Grafana via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Prometheus
- Grafana
- cAdvisor
- Prometheus Node Exporter

## Sources Consulted
- Portainer add stack documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path support documentation: https://docs.portainer.io/sts/advanced/relative-paths
- Portainer API documentation: https://docs.portainer.io/api/docs
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus exposition formats reference: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Node Exporter README: https://github.com/prometheus/node_exporter
- cAdvisor README: https://github.com/google/cadvisor
- Docker Compose services reference (`extra_hosts`): https://docs.docker.com/reference/compose-file/services/
- Docker daemon reference (`host-gateway`): https://docs.docker.com/reference/cli/dockerd/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana configuration reference (`root_url`): https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana Prometheus data source documentation: https://grafana.com/docs/learning-journeys/prometheus/add-data-source/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- Grafana health API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/other/
- Grafana dashboard 1860: https://grafana.com/grafana/dashboards/1860-node-exporter-full/
- Grafana dashboard 14282: https://grafana.com/grafana/dashboards/14282-cadvisor-exporter/

## Issues Found
- The original stack used `./prometheus.yml` from the Portainer web editor. Portainer documents relative path support only for Business Edition stacks deployed from Git with relative path support enabled, so I changed the stack to bind-mount `/opt/monitoring/prometheus.yml` directly.
- The stack required an external `proxy` network and hardcoded `GF_SERVER_ROOT_URL`, but the article's deployment flow used direct access on port `3000` and did not configure Traefik. I removed the proxy network dependency and the hardcoded root URL so the stack matches the documented access pattern.
- The cAdvisor image source was outdated. The official cAdvisor README now uses `ghcr.io/google/cadvisor` for current releases, so I updated the image and added `/dev/kmsg` to match the documented container run example.
- The Node Exporter image source and runtime settings were incomplete for host monitoring. The official Node Exporter container guidance requires host namespace access, so I updated the image to `quay.io/prometheus/node-exporter:latest`, added `network_mode: host` and `pid: host`, and adjusted Prometheus to scrape it via `host.docker.internal`.
- The Prometheus config tried to scrape Portainer at `/api/status`. Prometheus requires targets to expose Prometheus or OpenMetrics exposition formats, while Portainer documents its API as JSON-based, so I removed that invalid scrape job.
- The Grafana verification step assumed `curl -I /` would return `200 OK`. I replaced it with the documented Grafana health endpoint at `/api/health`.
- The Grafana UI navigation for adding a Prometheus data source and importing dashboards was outdated. I updated those instructions to match current Grafana documentation.
- The blog included a raw `POST /api/dashboards/import` example, but Grafana's official dashboard/API docs document UI import and dashboard APIs differently. I removed the unsupported API example and kept the documented UI import flow.
- Dashboard ID `1860` documents `job_name: node` in its usage example, so I changed the Prometheus scrape job from `node-exporter` to `node` to align the article with the dashboard it recommends.
- I removed the obsolete top-level Compose `version` key because Docker's current Compose Specification documents it as informational and obsolete.

## Review Notes
- The Node Exporter container setup shown here depends on host networking. Docker documents host network mode as supported on Linux hosts, and on Docker Desktop only when host networking is explicitly enabled.
- Dashboard IDs `14282` and `1860` are community dashboards on grafana.com. They are valid today, but their queries and assumptions can change independently of the blog post over time.
- The Node Exporter `1860` dashboard recommends additional collectors such as `systemd` and `processes` for full coverage. The post's setup will still collect core host metrics, but some optional panels may remain empty unless those collectors are enabled separately.
- I verified the article against official documentation and authoritative upstream READMEs. I did not deploy the full stack in this review environment.
