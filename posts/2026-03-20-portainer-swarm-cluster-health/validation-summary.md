# Validation Summary: How to Monitor Docker Swarm Cluster Health from Portainer - Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Engine API
- Prometheus
- Grafana
- Prometheus node_exporter
- cAdvisor
- Bash
- Python

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer Swarm details view: https://docs.portainer.io/sts/user/docker/swarm/details
- Portainer services and task status: https://docs.portainer.io/user/docker/services
- Portainer service task status: https://docs.portainer.io/sts/user/docker/services/tasks
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Docker Swarm task states: https://docs.docker.com/engine/swarm/how-swarm-mode-works/swarm-task-states/
- Docker configs in Swarm: https://docs.docker.com/engine/swarm/configs/
- Docker Compose configs reference: https://docs.docker.com/reference/compose-file/configs/
- Docker daemon metrics with Prometheus: https://docs.docker.com/engine/daemon/prometheus/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter
- cAdvisor README: https://github.com/google/cadvisor
- cAdvisor releases: https://github.com/google/cadvisor/releases

## Issues Found
- The Portainer UI navigation references did not match the documented Swarm views. I updated them to the documented `Swarm > Details`, `Services`, and per-service task views.
- The service health script read `ServiceStatus` from Docker's service list response without requesting it. I added `?status=true` and switched the output to the documented `RunningTasks` and `DesiredTasks` fields.
- The failed-task check claimed to show failures from the last 10 minutes but never applied the cutoff. I corrected the script to filter on each task's `Status.Timestamp`.
- The Prometheus stack mounted a named volume over `/etc/prometheus`, which would hide the configuration file it tried to start with. I changed the stack to use Swarm `configs` for `prometheus.yml` and `swarm-alerts.yml`.
- The exporter image references were outdated. I updated node_exporter to the official image reference used by its project, and changed cAdvisor from the old `gcr.io` image path to the current `ghcr.io/google/cadvisor` release tag.
- The alert rules snippet was mislabeled as `prometheus.yml` and used `docker_swarm_service_*` metrics that are not provided by the stack shown in the post. I relabeled it as `swarm-alerts.yml` and replaced the invalid example with a valid node-memory alert based on node_exporter metrics.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The stack now correctly references external `prometheus.yml` and `swarm-alerts.yml` files; the alert examples assume the Prometheus scrape jobs are named `node-exporter` and `cadvisor`.
- The cAdvisor image is pinned to `v0.56.2`, which was the latest release I verified on April 24, 2026.
