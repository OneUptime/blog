# Validation Summary: How to Use Ansible docker_container Module with Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible community.docker collection
- Docker containers
- Docker HEALTHCHECK
- Docker networking
- Docker restart policies
- PostgreSQL, Redis, MySQL, Elasticsearch, and RabbitMQ container health probes

## Sources Consulted
- Ansible community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible community.docker.docker_container_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_info_module.html
- Ansible community.docker.docker_network module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_network_module.html
- Dockerfile HEALTHCHECK reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker container run healthcheck options: https://docs.docker.com/reference/cli/docker/container/run/#healthcheck
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker service create reference for Swarm healthcheck options: https://docs.docker.com/reference/cli/docker/service/create/
- Docker restart policy documentation: https://docs.docker.com/engine/containers/run/#restart-policies---restart

## Issues Found
- The post description implied automated recovery from health checks. Docker health checks provide health status, but standalone Docker restart policies do not restart a container solely because it becomes unhealthy. Changed the description to "consistent health visibility."
- The state diagram and health-state explanation implied a container becomes unhealthy merely when the start period expires without a passing check. Docker only marks it unhealthy after counted health check failures exhaust the retry threshold, and a successful check during the start period ends the starting phase. Updated the diagram label and explanatory sentence.
- The dependent-services example used `postgres` as a hostname in `DATABASE_URL` but did not attach both containers to a user-defined network. Docker's default bridge network does not provide automatic DNS resolution by container name. Added an `app_net` network and attached both `postgres` and `webapp` to it.
- The restart policy section described health checks as working "hand-in-hand" with restart policies. Since restart policies act on container exit conditions, not failed health checks for standalone containers, revised this to say health checks complement restart policies and clarified the Swarm service context.

## Review Notes
- The `community.docker.docker_container` healthcheck fields used in the examples (`test`, `interval`, `timeout`, `retries`, and `start_period`) match the current Ansible community.docker documentation.
- The post could optionally mention `state: healthy` and `healthy_wait_timeout`, which are available in recent community.docker versions, but the explicit `docker_container_info` polling example is still technically valid.
