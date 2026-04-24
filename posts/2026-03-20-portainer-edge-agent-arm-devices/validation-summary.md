# Validation Summary: How to Run Portainer Edge Agent on ARM Devices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Edge Agent
- Portainer Business Edition
- Docker Engine
- Docker Compose
- systemd
- ARM / ARMv7 / ARM64 Linux devices

## Sources Consulted
- Portainer Edge Agent overview: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Update the Edge Agent: https://docs.portainer.io/start/upgrade/edge
- Edge Compute settings: https://docs.portainer.io/admin/settings/edge
- Auto onboarding: https://docs.portainer.io/admin/environments/aeec
- Waiting Room: https://docs.portainer.io/user/edge/waiting-room
- ARM architecture support: https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer agent source and deployment options: https://github.com/portainer/agent and https://github.com/portainer/agent/blob/develop/os/options.go
- Docker Engine install on Raspberry Pi OS (32-bit / armhf): https://docs.docker.com/engine/install/raspberry-pi-os/
- Docker Engine install on Debian: https://docs.docker.com/engine/install/debian/
- Docker `run` resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker image inspect reference: https://docs.docker.com/reference/cli/docker/image/inspect/

## Issues Found
- The post used `portainer/agent:latest` throughout. Portainer’s official upgrade guidance says the agent version must match the Portainer Server version, so I replaced this with a `PORTAINER_AGENT_TAG` placeholder tied to the server version requirement.
- The prerequisites implied both ports `8000` and `9443` are always required. Portainer documents that standard mode needs both, while async mode needs only the UI/API port, so I corrected the wording.
- The Docker installation snippet piped the convenience script straight to `sh` without `sudo`. Docker’s official install docs require root or `sudo`, so I changed the commands to Docker’s documented convenience-script flow and adjusted verification to use `sudo` in the current shell.
- The Portainer UI flow said `Docker Standalone -> Edge Agent`, but current docs require selecting `Docker Standalone`, starting the wizard, then choosing `Edge Agent Standard` or `Edge Agent Async`. I corrected the standard-mode steps accordingly.
- The post used `EDGE_PING_INTERVAL`, `EDGE_CMD_INTERVAL`, and `EDGE_SNAPSHOT_INTERVAL` as container environment variables. These are not supported Edge Agent env vars in the current Portainer agent source; Portainer documents those intervals as environment creation or Edge Compute settings. I removed the unsupported env vars and updated the explanation to point to the correct Portainer configuration path.
- Steps 4 and 5 attempted to run another container with the same `portainer_edge_agent` name without removing the existing one. That would fail in practice, so I added a remove-and-recreate step before the alternative `docker run` examples.
- The standalone and compose examples omitted mounts that Portainer’s documented deployment examples use for host access and persisted agent data. I added `-v /:/host` and `-v portainer_agent_data:/data` to align the examples with Portainer’s deployment guidance.
- The bulk provisioning section referred to a shared key from “edge group settings” and claimed an “auto-admit” flow. Portainer documents this as Auto onboarding plus Waiting Room association, so I updated the section to use the documented feature names and removed the unsupported auto-admit claim.
- The troubleshooting command `docker inspect portainer_edge_agent | grep Architecture` was incorrect for checking image architecture. I replaced it with an image-inspection flow that actually returns the architecture field from the running container’s image.
- The Raspberry Pi troubleshooting advice included a specific kernel command-line recommendation that I could not verify from current official documentation. I replaced it with Docker’s documented guidance to enable the required cgroup controllers when `docker info` reports missing memory or swap-limit support.

## Review Notes
- Docker’s official Raspberry Pi OS 32-bit documentation now warns that Docker Engine v28 was the last major version with Raspberry Pi OS 32-bit packages; ARMv7 remains possible via Debian `armhf` packages, but readers on 32-bit Raspberry Pi OS should watch Docker’s deprecation guidance closely.
- Portainer Edge Agent Async mode is only available in Portainer Business Edition. The post already assumed Business Edition, so no structural change was needed.
- Commands were validated against current official documentation and Portainer’s source, but not executed locally against a live ARM device and Portainer server during this review.
