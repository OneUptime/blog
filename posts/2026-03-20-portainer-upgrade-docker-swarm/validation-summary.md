# Validation Summary: How to Upgrade Portainer CE on Docker Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Swarm
- Docker CLI
- Docker Stack / Compose file format for Swarm

## Sources Consulted
- Portainer Docs, "Updating on Docker Swarm" (LTS): https://docs.portainer.io/2.33-lts/start/upgrade/swarm
- Portainer Docs, "Updating on Docker Swarm" (STS): https://docs.portainer.io/sts/start/upgrade/swarm
- Portainer Docs, "Install Portainer CE with Docker Swarm on Linux": https://docs.portainer.io/start/install-ce/server/swarm/linux
- Official Portainer CE Swarm stack manifest: https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml
- Docker Docs, "Deploy services to a swarm": https://docs.docker.com/engine/swarm/services/
- Docker Docs, "`docker service ps`": https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs, "`docker service logs`": https://docs.docker.com/reference/cli/docker/service/logs/
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/

## Issues Found
- The post hard-coded `portainer` and `portainer_data`, but the default `docker stack deploy -c ... portainer` workflow prefixes service and volume names. I updated the commands to use the documented default names `portainer_portainer`, `portainer_agent`, and `portainer_portainer_data`.
- The `docker service ps` examples placed `--filter` after the service name. I changed them to the documented form with options before the service name.
- The post told readers to pull a `latest` image on every node over SSH. Docker Swarm workers pull the resolved image digest when tasks are redeployed, and Portainer's documented Swarm update flow pulls images on the manager node before running `docker service update`. I replaced that step with manager-node pulls for the Portainer Server and Agent images.
- The post used `latest` tags for both services and the stack example. Docker's Swarm docs advise against frequently changing tags for services, and Portainer's current documented Swarm manifests and upgrade commands use release-stream tags. I changed these to `portainer/portainer-ce:lts` and `portainer/agent:lts`.
- The agent update command omitted `--force`, while Portainer's documented Swarm upgrade commands use `--force` to redeploy updated tasks. I added `--force` to both service update commands.
- The verification step claimed to check all running tasks but only checked the Portainer Server service. I added the agent service check as well.

## Review Notes
- The stack snippet remains valid with `version: '3.8'`, but `docker stack deploy` uses the legacy Compose file version 3 format rather than the newer Compose Specification.
- Portainer maintains separate LTS and STS release streams. This post now follows the current LTS stream, which matches the current official CE Swarm install manifest.
- `docker service logs` is valid for Swarm services, but Docker documents that it only works for services using the `json-file` or `journald` logging driver.
- Docker CLI verification through local `--help` output was not possible in this workspace because `docker` is not installed here, so command validation was done against the official Docker and Portainer documentation above.
