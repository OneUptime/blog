# Validation Summary: How to Secure Portainer in Production: Docker Socket Access, RBAC, TLS, and Network Exposure

## Status
validated

## Post Type
Production security guide

## Technologies Covered

- Portainer Community Edition and Business Edition
- Docker Engine and Docker Compose
- Portainer Agent and Edge Agent connectivity
- Docker socket and remote daemon security
- Portainer RBAC and resource access control
- TLS certificates and reverse proxies
- Network port publishing and firewall controls
- Portainer authentication, activity logging, and backups

## Sources Consulted

- [Portainer: Install Community Edition with Docker on Linux](https://docs.portainer.io/start/install-ce/server/docker/linux)
- [Portainer: Using your own SSL certificate](https://docs.portainer.io/advanced/ssl)
- [Portainer: CLI configuration options](https://docs.portainer.io/advanced/cli)
- [Portainer: Roles](https://docs.portainer.io/admin/user/roles)
- [Portainer: Docker roles and permissions](https://docs.portainer.io/advanced/docker-roles-and-permissions)
- [Portainer: Docker environment security settings](https://docs.portainer.io/user/docker/host/setup)
- [Portainer: Agent and Edge Agent connection security](https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents)
- [Portainer: Install Portainer Agent on Docker Standalone](https://docs.portainer.io/admin/environments/add/docker/agent)
- [Portainer: Authentication](https://docs.portainer.io/admin/settings/authentication)
- [Portainer: Authenticate via LDAP](https://docs.portainer.io/admin/settings/authentication/ldap)
- [Portainer: Authenticate via OAuth](https://docs.portainer.io/admin/settings/authentication/oauth)
- [Portainer: General settings, HTTPS, and backups](https://docs.portainer.io/admin/settings/general)
- [Portainer: Activity logs](https://docs.portainer.io/admin/logs/activity)
- [Docker: Docker Engine security and daemon attack surface](https://docs.docker.com/engine/security/)
- [Docker: Protect the Docker daemon socket](https://docs.docker.com/engine/security/protect-access/)
- [Docker: Port publishing and mapping](https://docs.docker.com/engine/network/port-publishing/)
- [Docker: Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker: `docker container inspect`](https://docs.docker.com/reference/cli/docker/container/inspect/)
- [Docker: `docker container port`](https://docs.docker.com/reference/cli/docker/container/port/)

## Issues Found

- The Environment Administrator role was described as having full control inside an environment without noting Portainer's documented restrictions. Changed the description to state that this role cannot perform host management, change resource ownership, or administer global Portainer settings.
- The Docker socket audit command placed `{{.Name}}` outside the mount-match condition, so it printed the name of every running container, including containers without the socket mount. Moved the name into the conditional and referenced the root inspection object with `{{$.Name}}`, so only matching mounts produce non-empty output.

## Review Notes

- The Docker Compose example was parsed successfully with Docker Compose v5.1.4, and the documented Portainer flags `--sslcert`, `--sslkey`, and `--http-disabled` are current.
- Current Portainer documentation labels the standard Agent connection for Docker Standalone as a legacy option and recommends an Edge Agent for most new remote-environment deployments. The post's security guidance for installations that still use the standard Agent remains accurate.
- Docker documents that localhost-published ports on Engine releases older than 28.0.0 could be reachable from hosts on the same layer-2 segment. The post already requires supported, patched Docker releases; older deployments should account for this caveat when relying on `127.0.0.1` bindings.
- All external documentation links in the post returned successful HTTP responses during validation.
