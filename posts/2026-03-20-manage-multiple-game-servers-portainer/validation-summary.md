# Validation Summary: How to Manage Multiple Game Servers with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Engine
- Nginx Proxy Manager
- Prometheus
- Grafana
- Prometheus node_exporter
- Bash

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `ps` reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker container filtering reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker label reference: https://docs.docker.com/engine/manage-resources/labels/
- Nginx Proxy Manager setup docs: https://nginxproxymanager.com/setup/
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter
- Portainer Edge Jobs docs: https://docs.portainer.io/2.33-lts/user/edge/jobs
- Watchtower docs: https://containrrr.dev/watchtower/
- Watchtower arguments docs: https://containrrr.dev/watchtower/arguments/

## Issues Found
- The Step 2 Compose example used `deploy.resources` for limits. Docker’s Compose docs note that `deploy` is optional and ignored when not implemented, so this was not a reliable example for Docker Standalone stacks. I changed it to service-level `cpus`, `mem_limit`, and `mem_reservation`.
- The Step 3 reverse-proxy example incorrectly ran a separate `nginx` service on ports `80` and `443` alongside Nginx Proxy Manager, which would conflict on the same host ports. It also implied label-based auto-configuration that Nginx Proxy Manager does not provide. I removed the extra `nginx` service and kept a valid Nginx Proxy Manager stack.
- The Step 3 and Step 4 examples used named volumes without declaring them at the top level. I added the missing volume declarations so the Compose snippets are self-consistent.
- The Step 4 `node-exporter` example mounted `/proc` and `/sys` but did not use the host-root mount and `--path.rootfs` flag required by the project’s containerized host-monitoring guidance. I updated the example to match the documented host-monitoring pattern.
- The Step 5 restart guidance referred to generic Portainer “scheduled jobs” and suggested Watchtower as an alternative. Portainer’s scheduling feature for host scripts is documented as Edge Jobs, and Watchtower is for scheduled image update checks rather than arbitrary restart scripts. I changed the text to Portainer Edge Jobs or host cron.
- The Step 5 script hardcoded old Compose-style container names, which is brittle and does not match current Compose naming conventions reliably. I changed the script to restart containers by the `com.docker.compose.project` label instead.
- The Compose snippets used a top-level `version: "3.8"` field. Docker documents this field as obsolete in the current Compose specification, so I removed it.

## Review Notes
- The Prometheus example still depends on `/opt/monitoring/prometheus.yml` being configured with the correct scrape targets. Because `node-exporter` runs with `network_mode: host`, the scrape target should be the host address on port `9100`, not Prometheus container-local `localhost`.
- `GF_SECURITY_ADMIN_PASSWORD=admin` is valid as a simple example, but it should be replaced before exposing Grafana beyond a trusted network.
- The pinned Prometheus and Grafana image tags are valid examples, but they will age and should be refreshed periodically.
