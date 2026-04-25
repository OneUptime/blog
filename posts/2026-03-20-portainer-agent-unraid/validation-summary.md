# Validation Summary: How to Install Portainer Agent on Unraid

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Agent
- Portainer CE / BE
- Unraid
- Docker
- SSH

## Sources Consulted
- Portainer Documentation, "Install Portainer Agent on Docker Standalone": https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation, "Add a Docker Standalone environment": https://docs.portainer.io/admin/environments/add/docker
- Portainer Documentation, "Updating on Docker Standalone": https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation, "Details" and "Setup" for Docker standalone hosts: https://docs.portainer.io/user/docker/host/details and https://docs.portainer.io/sts/user/docker/host/setup
- Portainer Agent official repository README: https://github.com/portainer/agent
- Docker Docs, "Running containers": https://docs.docker.com/engine/containers/run/
- Unraid Docs, "Overview" for Docker containers: https://docs.unraid.net/unraid-os/using-unraid-to/run-docker-containers/overview/
- Unraid Docs, "Managing & customizing containers": https://docs.unraid.net/unraid-os/using-unraid-to/run-docker-containers/managing-and-customizing-containers/

## Issues Found
- The post used `portainer/agent:latest` throughout. I changed the examples to `portainer/agent:lts` and added guidance to match the agent tag to the Portainer Server version or release channel, because Portainer's official upgrade guidance says the agent version should match the server version.
- The deployment and update instructions omitted the `AGENT_SECRET` requirement. I added notes explaining that if the Portainer Server is configured with `AGENT_SECRET`, the same value must be passed to the agent or the connection can fail.
- The "Agent Configuration Options" example included `AGENT_CLUSTER_ADDR` for an Unraid Docker standalone deployment. I removed it and kept a valid standalone example with `LOG_LEVEL`, because `AGENT_CLUSTER_ADDR` is for clustered agent scenarios such as Swarm and is not part of a normal standalone Unraid setup.
- The firewall wording implied Unraid itself provides the relevant firewall configuration path. I tightened the wording to refer generically to any firewall or network filtering between Portainer and Unraid, which is the technically accurate requirement.

## Review Notes
Portainer currently documents the Docker Standalone Portainer Agent as a legacy option and recommends the Edge Agent for most new deployments, especially when you do not want to expose port `9001` or you need edge features or policy management. The post remains technically valid for a direct agent-based Unraid setup after the fixes above.
