# Validation Summary: How to Add a Docker Standalone Environment to Portainer via API - Add

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker remote API
- TLS / OpenSSL
- systemd
- `curl`
- `ufw`
- `iptables`

## Sources Consulted
- Docker Docs: Configure remote access for Docker daemon - https://docs.docker.com/engine/daemon/remote-access/
- Docker Docs: Protect the Docker daemon socket - https://docs.docker.com/engine/security/protect-access/
- Docker Docs: `dockerd` CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Portainer Docs: Connect to the Docker API - https://docs.portainer.io/admin/environments/add/docker/api
- Portainer Docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs

## Issues Found
- The root-owned file creation commands were incorrect. `sudo cat > /etc/...` and the unsudoed `cat > /etc/docker/daemon.json` relied on shell redirection that would fail without a root shell. I changed these to `sudo tee ... > /dev/null << 'EOF'` so the commands work as written.
- The TLS server certificate example omitted `extendedKeyUsage = serverAuth` in the server certificate extension file. Docker's TLS guidance includes this for server certificates, so I added it.
- The TLS daemon configuration used the `hosts` key in `daemon.json` while targeting a systemd-managed Docker setup. Docker's documentation warns that on systemd systems `-H` is already set at startup, so adding `hosts` in `daemon.json` conflicts and can prevent Docker from starting. I replaced that snippet with a systemd drop-in override that sets the TLS flags and TCP listener directly on `dockerd`.
- The Portainer API example was incorrect. Portainer's documented `/api/endpoints` creation flow for a TLS-secured Docker environment uses `multipart/form-data` with fields such as `EndpointCreationType`, `TLSCACertFile`, `TLSCertFile`, and `TLSKeyFile`; it does not use the JSON payload shown in the original post with base64-encoded certificate contents. I replaced the example with the documented multipart `curl --form` equivalent.

## Review Notes
- Portainer documents direct Docker API connectivity as a legacy option and recommends the Edge Agent for most new deployments. The post is still technically relevant because Portainer continues to support API-based environments.
- Docker documents remote access without TLS as not recommended and notes it will require explicit opt-in in a future release.
