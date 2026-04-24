# Validation Summary: How to Secure Your Portainer Installation

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer CE
- Portainer BE
- Portainer HTTP API
- Docker
- TLS / HTTPS
- UFW
- iptables

## Sources Consulted
- Portainer docs, "Using your own SSL certificate with Portainer": https://docs.portainer.io/advanced/ssl
- Portainer docs, "CLI configuration options": https://docs.portainer.io/advanced/cli
- Portainer docs, "Initial setup" (CE): https://docs.portainer.io/start/install-ce/server/setup
- Portainer docs, "Authentication": https://docs.portainer.io/admin/settings/authentication
- Portainer docs, "General": https://docs.portainer.io/admin/settings/general
- Portainer docs, "Connect to the Docker Socket": https://docs.portainer.io/admin/environments/add/docker/socket
- Portainer docs, "Setup" for Docker Standalone environments: https://docs.portainer.io/user/docker/host/setup
- Portainer docs, "Create a Docker, Swarm or Podman security policy": https://docs.portainer.io/admin/environments/policies/docker-policies/security-policy
- Portainer docs, "Create a Docker, Swarm or Podman registry policy": https://docs.portainer.io/admin/environments/policies/docker-policies/registry-policy
- Portainer docs, "Registries" for Docker host environments: https://docs.portainer.io/user/docker/host/registries
- Portainer docs, "What information does Portainer collect?": https://docs.portainer.io/faqs/getting-started/what-information-does-portainer-collect
- Portainer docs, "I enabled Force HTTPS only and now I'm locked out of Portainer. How do I get back in?": https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/i-enabled-force-https-only-and-now-im-locked-out-of-portainer.-how-do-i-get-back-in
- Portainer docs, "Roles" (official roles reference consulted during RBAC review): https://docs.portainer.io/admin/user/roles
- Portainer API schema, CE 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker docs, "Port publishing and mapping": https://docs.docker.com/engine/network/port-publishing/
- Docker docs, "Content trust in Docker": https://docs.docker.com/engine/security/trust/
- Docker docs, "Protect the Docker daemon socket": https://docs.docker.com/engine/security/https/
- Docker docs, "Docker Engine security": https://docs.docker.com/engine/security/

## Issues Found
- The HTTPS startup command used the deprecated `--ssl` flag. I removed it and kept the current `--sslcert` / `--sslkey` usage, because Portainer serves HTTPS by default and current docs no longer require `--ssl`.
- The admin initialization API example used incorrect JSON field names (`username` / `password`) and attempted shell substitution inside a single-quoted JSON string, which would not execute. I changed it to the documented `Username` / `Password` payload and used a shell variable for password generation.
- The post suggested removing the default admin user after setup. I replaced that with guidance to choose a custom username during initial setup, because Portainer documents the initial administrator as a special break-glass account when external authentication is enabled.
- The password section presented best-practice complexity guidance as if it were a documented Portainer requirement. I reworded it as strong-password guidance while keeping the documented 12-character minimum.
- The network-binding `docker run` example had invalid shell syntax because of the inline comment placement. I corrected the multiline command.
- The settings section pointed readers to `Settings -> Security`, referenced disabling telemetry, and used an incorrect `PUT /api/settings` payload. I replaced it with the current documented UI locations: `Settings -> Authentication` for session lifetime and minimum password length, and `Settings -> General` for `Force HTTPS only`.
- The RBAC section implied the same model applied equally to CE and BE and included unsupported role assumptions in the API example. I removed the incorrect API example and clarified that full RBAC is a BE feature, while CE relies on environment and resource access controls.
- The dangerous-settings section used an outdated UI path and inaccurate setting names. I updated it to the current `Host/Swarm -> Setup -> Docker Security Settings` path and the documented `Hide ... for non-administrators` options.
- The Docker socket hardening section used host group and permission commands that do not accurately reflect Portainer's documented containerized access model. I replaced that with current guidance: direct socket access is legacy, keep the socket local-only, and use Agent/SSH/TLS for remote access.
- The `DOCKER_CONTENT_TRUST=1` section was technically incorrect for Portainer. Docker Content Trust is a Docker client / daemon control, not a Portainer server hardening knob. I replaced that section with Portainer-native registry access restrictions and registry policy guidance.

## Review Notes
- As of 2026-04-24, Portainer's maintained LTS release stream is 2.39.x. The post is now aligned with current Portainer behavior, including the removal of telemetry collection from newer releases.
- Several security and governance capabilities mentioned in the post, including granular RBAC, registry policies, and authentication logs, are Business Edition features and are now labeled accordingly.
- The post still uses `portainer/portainer-ce:latest` in example `docker run` commands. This is syntactically valid, but pinning to a supported LTS tag or specific version would be safer for production guidance in a future revision.
