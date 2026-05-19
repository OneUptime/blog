# Validation Summary: How to Configure Portainer for Multi-Host Container Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Docker Engine
- Docker Compose
- Portainer Community Edition
- Portainer Business Edition
- Portainer Agent
- UFW
- OpenSSL

## Sources Consulted
- Portainer CE Docker Standalone installation documentation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Agent on Docker Standalone documentation: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Docker Standalone upgrade documentation: https://docs.portainer.io/start/upgrade/docker
- Portainer Agent security FAQ: https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer mTLS documentation: https://docs.portainer.io/advanced/mtls
- Portainer stack deployment from Git documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer access control documentation: https://docs.portainer.io/advanced/access-control
- Portainer roles documentation: https://docs.portainer.io/admin/user/roles
- Docker Compose Specification documentation for the obsolete version field: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose interpolation documentation: https://docs.docker.com/reference/compose-file/interpolation/
- Local Docker CLI help output for `docker run`
- Local UFW help output for `ufw allow`

## Issues Found
- The post said the Agent communicates with the server over port 9001. The standalone Agent listens on port 9001 and the Portainer Server connects to it, so the wording was corrected.
- The post described the web UI as available on port 9000 by default. Current Portainer uses HTTPS on 9443 by default; port 9000 is legacy HTTP and only available if explicitly exposed. The wording was corrected.
- The Docker image tags used `latest`. The official Portainer documentation uses the `lts` and `sts` streams, with LTS recommended for production stability. The commands were updated to use `portainer/portainer-ce:lts` and `portainer/agent:lts`.
- The post instructed users to enter `tcp://remote-host-ip:9001` as the Agent environment URL. Current Portainer documentation says not to include a protocol. The example was changed to `remote-host-ip:9001`.
- The post claimed Agent communication is unencrypted by default and provided an OpenSSL certificate workflow for the standalone Agent. Current Portainer documentation says Agent communication uses a claim process and HTTPS with Agent-generated certificates, while `AGENT_SECRET` is the supported shared-secret hardening option. The section was rewritten accordingly and notes that mTLS applies to Edge Agent communication in Business Edition.
- The post claimed Portainer stores private Git credentials encrypted. The official Git credentials documentation confirms saved credentials can be reused without exposing the secret value to admin users, while full Portainer database encryption is a separate optional feature. The wording was adjusted to avoid overstating default encryption behavior.
- The Docker Compose example included the top-level `version: "3.8"` field. Docker now marks the Compose `version` field as obsolete, so it was removed.

## Review Notes
- The standard Portainer Agent on Docker Standalone is documented as a legacy option, and Portainer recommends Edge Agent for most use cases, especially where port 9001 is not directly reachable or environments are on untrusted networks.
- The example application images such as `nginx:1.25-alpine`, `postgres:15-alpine`, and `myapp/api:latest` are illustrative. Pinning maintained application image versions would be preferable in a production tutorial.
