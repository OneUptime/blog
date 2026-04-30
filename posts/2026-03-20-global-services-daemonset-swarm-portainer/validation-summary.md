# Validation Summary: How to Set Up Global Services in Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker stack / Compose v3 for Swarm
- Filebeat
- Prometheus Node Exporter

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker stack deploy` reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Store configuration data using Docker Configs - https://docs.docker.com/engine/swarm/configs/
- Docker Docs: `docker service create` reference - https://docs.docker.com/reference/cli/docker/service/create/
- Portainer Docs: Services - https://docs.portainer.io/user/docker/services
- Portainer Docs: View the status of a service task - https://docs.portainer.io/sts/user/docker/services/tasks
- Elastic Docs: Run Filebeat on Docker - https://www.elastic.co/docs/reference/beats/filebeat/running-on-docker
- Prometheus node_exporter README - https://github.com/prometheus/node_exporter

## Issues Found
- The Filebeat example used `ELASTICSEARCH_HOST=elasticsearch:9200`, but that environment variable does not configure Filebeat output by itself. I replaced it with the official `filebeat -e --strict.perms=false -E output.elasticsearch.hosts=["elasticsearch:9200"]` style command and added `user: root`, which matches Elastic's Docker guidance.
- The Filebeat example used a relative bind mount (`./filebeat.yml`) inside a Swarm stack. Docker's Compose/Swarm documentation says relative host paths are only supported for local runtimes and are rejected for non-local deployments, so I changed it to an absolute host path and clarified that the file must exist on every node.
- The Node Exporter example combined `network_mode: host` with published ports. Docker's Compose reference says port mappings must not be used with `network_mode: host`, so I removed `network_mode: host`.
- The Node Exporter example mounted the host root filesystem but did not pass `--path.rootfs`, which the official Node Exporter Docker guidance requires for host monitoring. I added `--path.rootfs=/rootfs`.
- The Node Exporter filesystem exclude regex did not match the official pattern and would miss common Docker mount-path exclusions. I updated it to a Docker-documented/Prometheus-documented form.
- The post repeatedly said global services run on "every node". Docker's Swarm docs are more precise: global services run on every available node that satisfies placement constraints and resource requirements. I tightened that wording in the description, intro, service mode table, and summary.
- The Portainer summary referred to replica "health status". Portainer's documentation is framed around service tasks and task status, so I changed the wording to match the product documentation.

## Review Notes
- The Node Exporter example is Linux-oriented because it relies on Linux host paths such as `/proc`, `/sys`, and `/`.
- Docker's current Swarm docs note that `docker stack deploy` uses the legacy Compose v3 format rather than the latest Compose specification. The post's `version: "3.8"` examples remain appropriate for Swarm stacks.
- I could not run Docker CLI validation locally because `docker` is not installed in this workspace, so the review was documentation-based rather than runtime-tested.
