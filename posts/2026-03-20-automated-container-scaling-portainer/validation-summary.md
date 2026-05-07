# Validation Summary: How to Build an Automated Container Scaling System with Portainer

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Portainer API
- Docker Swarm
- Docker Engine API
- Prometheus
- cAdvisor
- Python `requests`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Docker Engine API `POST /services/{id}/update`: https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker Swarm services: https://docs.docker.com/engine/swarm/services/
- Docker `service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Docker Swarm guide: https://prometheus.io/docs/guides/dockerswarm/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/2.55/querying/api/
- cAdvisor runtime and deployment docs: https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor Prometheus metrics docs: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- The original cAdvisor image reference used `gcr.io/cadvisor/cadvisor:latest`, but current official cAdvisor docs use `ghcr.io/google/cadvisor` for current releases. I updated the image reference so the deployment matches the current upstream image location.
- The original Prometheus service mounted an empty named volume at `/etc/prometheus`, which would not provide a valid `prometheus.yml`. I replaced that with an explicit config mount and added the required `prometheus.yml` snippet.
- The original metrics stack ran a single cAdvisor instance. In Swarm, that only observes the node where it runs, which is incomplete for cluster-wide service autoscaling. I changed cAdvisor to a global service and placed Prometheus on a manager node with Docker Swarm service discovery, matching the official Prometheus Swarm guidance.
- The original PromQL filtered on the cAdvisor `name` label with a regex. That is not a reliable way to identify a Swarm service. I changed the query to filter on `container_label_com_docker_swarm_service_name`, which is the correct service-level label exposed through cAdvisor metrics when Docker labels are present.

## Review Notes
- The Portainer API examples are technically valid because Portainer proxies Docker API requests through `/api/endpoints/<ENVIRONMENT_ID>/docker`, and Docker service updates still use the service spec plus the current `Version.Index`.
- The autoscaling logic assumes the target services use replicated mode. The example code would not apply to global services or Swarm job modes without additional handling.
- The post still uses `latest` image tags. That is not incorrect, but pinning versions would make the walkthrough more reproducible over time.
