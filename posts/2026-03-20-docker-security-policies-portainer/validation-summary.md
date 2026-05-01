# Validation Summary: How to Set Up Docker Security Policies in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux capabilities
- Seccomp
- `jq`

## Sources Consulted
- Portainer Host Setup: https://docs.portainer.io/user/docker/host/setup
- Portainer Docker security policy reference: https://docs.portainer.io/admin/environments/policies/docker-policies/security-policy
- Portainer Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer API documentation: https://docs.portainer.io/api/docs
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker seccomp security profiles: https://docs.docker.com/engine/security/seccomp/
- Docker bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Docker `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
- The post overstated Portainer's enforcement scope by implying it can reject direct Docker daemon calls and enforce policy for all host deployments. I corrected the wording so it now states that requests made through Portainer inherit the user's Portainer permissions, and that the security baseline applies to deployments managed through Portainer.
- The navigation path and setting names did not match current Portainer documentation. I updated the instructions to use the environment's `Host` or `Swarm` page, the `Setup` tab, and the documented `Docker Security Settings` options.
- The section on host namespace access listed separate host PID, host IPC, and host network toggles that Portainer's current Docker security settings do not expose. I replaced that with the documented host PID restriction.
- The Compose hardening example used `seccomp:default`, which is not the documented seccomp configuration pattern in Docker Compose. I updated the example to rely on Docker's default seccomp profile unless it is explicitly overridden.
- The bind-mount audit command inspected `HostConfig.Binds`, which is not the most reliable way to detect bind mounts created via current Docker mount syntax. I updated it to inspect bind mounts through the container's `Mounts` data.

## Review Notes
- The post covers Portainer's per-environment Docker security settings. Portainer's separate Fleet Governance Policies feature is a different capability with additional product and environment requirements.
- The remaining host-network audit command is technically correct Docker guidance, but current Portainer Docker security settings do not provide a dedicated non-admin host-network toggle.
