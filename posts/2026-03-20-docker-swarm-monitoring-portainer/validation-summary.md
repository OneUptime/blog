# Validation Summary: How to Deploy a Full Monitoring Stack on Docker Swarm with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker
- Docker Swarm
- Portainer
- Prometheus
- Grafana
- Alertmanager
- Node Exporter
- cAdvisor

## Sources Consulted
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Prometheus Docs: Docker Swarm guide - https://prometheus.io/docs/guides/dockerswarm/
- Prometheus Docs: Configuration - https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Docs: Alerting based on metrics - https://prometheus.io/docs/tutorials/alerting_based_on_metrics/
- Prometheus node_exporter README - https://github.com/prometheus/node_exporter/blob/master/README.md
- cAdvisor running guide - https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor releases - https://github.com/google/cadvisor/releases
- Grafana Docs: Add the Prometheus data source - https://grafana.com/docs/learning-paths/prometheus/add-data-source/
- Grafana Docs: Set up Grafana for high availability - https://grafana.com/docs/grafana/latest/setup-grafana/set-up-for-high-availability/
- Grafana dashboard 1860 - https://grafana.com/grafana/dashboards/1860
- Grafana dashboard 609 - https://grafana.com/grafana/dashboards/609

## Issues Found
- The post told readers to create an overlay network manually, but the stack file defined a stack-managed network instead of using that pre-created network. I changed the stack network to `external: true` with `name: monitoring` so the deployed services actually attach to the network created in Step 1.
- The Node Exporter container mounted the host root filesystem but did not pass `--path.rootfs`, which upstream documents as required when bind-mounting the host root into the container for host monitoring. I added `--path.rootfs=/rootfs` to match the existing mount.
- The cAdvisor image reference used `gcr.io/cadvisor/cadvisor:latest`. Upstream has moved current images to `ghcr.io/google/cadvisor`, and the old `gcr.io` `latest` tag is documented as outdated. I updated the image to `ghcr.io/google/cadvisor:v0.56.2`, which was the latest release shown by the official cAdvisor releases page at review time.
- The Grafana UI instructions were partially outdated. I updated the data source navigation to `Connections > Data sources` and changed the add button text to `Add new data source` to match current Grafana documentation.
- The recommended Docker Swarm dashboard ID `893` is no longer the best current reference point. I replaced it with dashboard ID `609`, which is a currently available Grafana dashboard for Docker Swarm and container overview metrics.
- The post overstated what the provided stack delivers. As written, it does not make Prometheus, Grafana, or Alertmanager highly available, and it does not wire Prometheus alerting rules to Alertmanager. I corrected the introduction, HA note, and conclusion so they describe the deployment accurately.

## Review Notes
- Docker Swarm stack deployments still use the legacy Compose v3 file format through `docker stack deploy`, which is why the post's `version: "3.8"` format remains appropriate.
- The stack uses local named volumes for Prometheus and Grafana. If those singleton services are rescheduled onto a different node, their data does not automatically follow them without shared storage.
- The post now accurately deploys an Alertmanager instance, but it still does not include example Prometheus alerting rules or an Alertmanager receiver configuration. That is acceptable after the wording corrections, but readers who want active notifications still need to add those pieces.
