# Validation Summary: How to Change the Default Portainer Port from 9443

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker
- Docker Compose
- Nginx
- UFW

## Sources Consulted
- Portainer Documentation, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Documentation, "CLI configuration options": https://docs.portainer.io/advanced/cli
- Portainer Documentation, "Requirements and prerequisites": https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Documentation, "Deploying Portainer behind nginx reverse proxy": https://docs.portainer.io/advanced/reverse-proxy/nginx
- Docker Docs, "`docker container run`": https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs, "Port publishing and mapping": https://docs.docker.com/engine/network/port-publishing/
- Ubuntu Manpages, "`ufw(8)`": https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html

## Issues Found
- The introduction stated that Portainer serves the UI on both `9443` and `9000` by default. I corrected this to match current Portainer documentation: `9443` is the default UI port, while `9000` is optional legacy HTTP access.
- The first `docker run` example had a shell syntax error because the line continuation backslash was followed by an inline comment. I removed the inline comment so the command is valid.
- The localhost-binding example also bound port `8000` to `127.0.0.1`, which would break remote Edge Agent tunnels. I changed the example to bind only the UI port locally and added a note about publishing `8000` separately when Edge Agents are used.
- The Agent section conflated standard Portainer Agents with the Edge Agent tunnel port. I corrected the text to state that `8000` is for Edge Agent tunneling and that standard Portainer Agents use port `9001`.
- The firewall section suggested `ufw deny 9443/tcp` as a way to stop exposing the old Docker-published port. I replaced this with guidance to remove the old Docker port mapping, because Docker manages published ports through its own iptables rules.

## Review Notes
- The examples use the floating image tag `portainer/portainer-ce:latest`. This is valid, but `sts`, `lts`, or a pinned version would be more reproducible over time.
