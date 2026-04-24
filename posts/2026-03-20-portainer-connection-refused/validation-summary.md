# Validation Summary: How to Fix 'Connection Refused' Errors in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Portainer Agent
- Docker Engine
- Docker Engine API
- Linux networking and firewall tooling
- Rootless Docker

## Sources Consulted
- Portainer CE install docs for Docker on Linux (default ports, image tags): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer CLI configuration options (`--http-disabled`, bind defaults): https://docs.portainer.io/advanced/cli
- Portainer Agent install docs for Docker Standalone (`9001`, HTTPS communication, legacy status): https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer SSL docs (self-signed default, custom cert behavior): https://docs.portainer.io/advanced/ssl
- Portainer FAQ on first-install UI timeout after 5 minutes: https://docs.portainer.io/sts/faqs/installing/i-just-installed-portainer-but-i-cant-access-the-ui-how-do-i-fix-this
- Portainer requirements and prerequisites (UI/API and agent ports): https://docs.portainer.io/2.21/start/requirements-and-prerequisites
- Docker Engine API docs (version negotiation and versioned API requests): https://docs.docker.com/reference/api/engine/
- Docker rootless mode docs (rootless socket path under `/run/user/<uid>/docker.sock`): https://docs.docker.com/engine/security/rootless/

## Issues Found
- The post treated port `9000` as the primary Portainer UI port. Current Portainer installs expose the UI on `9443` by default, with `9000` retained only for legacy HTTP access. I updated the browser and `curl` examples plus the listening-port check to reflect that.
- The Docker socket test hardcoded API version `v1.44`. Docker's supported API version depends on the installed daemon version, so that example can fail on both older and newer supported releases. I changed it to negotiate the server API version first, then query `/version` with that value.
- The remediation commands used `portainer/portainer-ce:latest`, while current Portainer install guidance uses the LTS tag. I updated the Portainer server commands to `portainer/portainer-ce:lts` and aligned the agent remediation command to `portainer/agent:lts`.
- The HTTPS troubleshooting section labeled the problem as a self-signed certificate issue. A self-signed cert causes certificate validation warnings, not a TCP connection refusal. I corrected the wording so the section points to missing port mappings or TLS startup errors instead.
- The article's conclusion was too narrow and omitted Portainer's documented first-install timeout case, where the server stops listening if no admin user is created within five minutes. I added that documented cause and a restart fix.

## Review Notes
- Portainer documents the Docker Standalone Agent as a legacy option and recommends the Edge Agent for many remote-environment use cases.
- Portainer also documents a Docker Engine 29.0.0 compatibility issue in older Portainer releases; environments running Portainer versions prior to 2.33.5 LTS / 2.36.0 STS may need an upgrade if Docker itself has already been upgraded.
