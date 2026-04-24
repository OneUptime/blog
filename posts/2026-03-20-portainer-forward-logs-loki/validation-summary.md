# Validation Summary: How to Forward Container Logs to Loki via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Portainer stacks
- Docker logging drivers and plugins
- Grafana Loki
- Promtail
- Grafana Alloy
- Grafana Explore / LogQL
- Prometheus Docker service discovery and relabeling

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Docker Docs, "Configure logging drivers": https://docs.docker.com/engine/logging/configure/
- Docker Docs, "docker plugin install": https://docs.docker.com/reference/cli/docker/plugin/install/
- Docker Docs, "docker plugin ls": https://docs.docker.com/reference/cli/docker/plugin/ls/
- Grafana Loki Docs, "Docker driver client": https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docs, "Docker driver client configuration": https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Loki Docs, "Promtail agent": https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Docs, "Configure Promtail": https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana Loki Docs, "Install Promtail": https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Loki Docs, "docker stage": https://grafana.com/docs/loki/latest/send-data/promtail/stages/docker/
- Grafana Cloud Docs, "Monitor Docker containers with Grafana Alloy": https://grafana.com/docs/grafana-cloud/send-data/alloy/monitor/monitor-docker-containers/
- Prometheus Docs, "`docker_sd_config` configuration": https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana Loki Docs, "Query": https://grafana.com/docs/loki/latest/query/

## Issues Found
- The Docker driver install command used `grafana/loki-docker-driver:latest`. I changed it to a versioned, architecture-specific plugin tag and added the ARM64 variant note, matching current Grafana Loki documentation.
- The Docker driver examples used `http://loki:3100/loki/api/v1/push` for `loki-url`. I changed this to `http://<loki-host>:3100/loki/api/v1/push` and clarified that the endpoint must be reachable from the Docker host, because the logging plugin runs at the Docker host level rather than inside the application container network.
- The `daemon.json` section implied that changing the default log driver would apply universally right away. I added the missing Docker restart caveat and noted that existing containers must be recreated for the new default to take effect.
- The Promtail section described Promtail as the recommended option for auto-discovery. That is no longer correct on April 24, 2026: Promtail is end of life as of March 2, 2026, and Grafana Alloy is the supported option for new deployments. I corrected that guidance while keeping the Promtail method for existing deployments.
- The Promtail image pin (`grafana/promtail:2.9.4`) was outdated. I updated it to a current 3.x tag from Grafana's install guidance.
- The Promtail pipeline incorrectly chained `json`, `labels`, and `output` after `docker: {}`. I removed those stages because the Docker stage already handles Docker log parsing; the original sequence was not a correct generic Docker log pipeline.
- The Promtail relabeling used invalid Docker SD meta labels: `__meta_docker_container_image`, `__meta_docker_compose_service`, and `__meta_docker_compose_project`. I replaced the Compose service/project extraction with the documented container-label meta labels and removed the unsupported image relabel.
- The LogQL examples overstated what the queries did. I removed an unnecessary `| json`, replaced the incorrect "Last 100 log lines" example with a plain container selector, and clarified that the examples depend on which labels are forwarded.
- The comparison table understated the Loki driver's built-in Compose/Swarm label discovery and overstated Promtail's recommendation status. I corrected both entries.

## Review Notes
- Promtail remains documented in the post only as an existing-deployment path. For new Docker-based deployments, Grafana now documents Grafana Alloy as the supported agent and recommends the Docker logging driver for local Docker / Docker Compose environments.
- Version pins in operational blog posts age quickly. This post is technically accurate as reviewed on 2026-04-24, but the pinned plugin/image tags should be refreshed during future audits.
