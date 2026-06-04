# Validation Summary: How to Scale Docker Swarm Services Based on Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Swarm
- Docker CLI
- Docker Compose / stack files
- Docker SDK for Python
- Prometheus
- cAdvisor
- Node Exporter
- PromQL
- Python
- Bash
- RabbitMQ metrics

## Sources Consulted
- Docker CLI reference: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Docker CLI reference: `docker service update` - https://docs.docker.com/reference/cli/docker/service/update/
- Docker CLI reference: `docker service ps` - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker CLI reference: `docker container stats` / `docker stats` - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Swarm configs documentation - https://docs.docker.com/engine/swarm/configs/
- Docker Swarm networking documentation - https://docs.docker.com/engine/swarm/networking/
- Docker daemon Prometheus metrics documentation - https://docs.docker.com/engine/daemon/prometheus/
- Docker SDK for Python services documentation - https://docker-py.readthedocs.io/en/stable/services.html
- Docker Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Prometheus configuration reference - https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus cAdvisor guide - https://prometheus.io/docs/guides/cadvisor/

## Issues Found
- The Prometheus configuration included a `docker` scrape job targeting `172.17.0.1:9323`, but the post did not configure Docker daemon metrics with `metrics-addr`, and the Docker documentation notes that this endpoint is for Docker daemon metrics, not application/container metrics. Removed the unused scrape job because the article's scaling queries use cAdvisor metrics.
- The Python autoscaler used `PROMETHEUS_URL = "http://prometheus:9090"` while the deployment command creates the autoscaler as a standalone service attached to the `monitoring_monitoring` network. In that setup, the stack service is named `monitoring_prometheus`, so the URL was changed to `http://monitoring_prometheus:9090`.
- The shell autoscaler passed `docker service ps -q` output to `docker stats`. Docker documents `docker service ps -q` as task IDs, while `docker stats` accepts container IDs or names. Updated the shell script to discover running containers by the Swarm service label with `docker ps -q --filter "label=com.docker.swarm.service.name=$SERVICE"` and added an empty-result guard.

## Review Notes
- The Docker CLI examples for `docker service scale`, `docker service update --replicas`, `docker stack deploy`, and `docker service create` are current and valid for Swarm services.
- The Docker SDK for Python `service.scale(replicas)` API is current in the published SDK documentation.
- The cAdvisor CPU PromQL examples are structurally valid, but threshold values should still be tuned against the service's CPU limits and host capacity in a real cluster.
- The shell-based approach uses the local Docker daemon's visible containers. In a multi-node Swarm, Prometheus/cAdvisor remains the more appropriate approach for cluster-wide metrics.
