# Validation Summary: How to Set Up Swarm Inter-Node Encryption in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Docker overlay networking
- Docker daemon TLS
- Portainer
- HashiCorp Vault
- OpenSSL

## Sources Consulted
- Docker Docs: Swarm manager locking - https://docs.docker.com/engine/swarm/swarm_manager_locking/
- Docker Docs: `docker swarm init` CLI reference - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: `docker swarm unlock` CLI reference - https://docs.docker.com/reference/cli/docker/swarm/unlock/
- Docker Docs: `docker swarm unlock-key` CLI reference - https://docs.docker.com/reference/cli/docker/swarm/unlock-key/
- Docker Docs: Swarm PKI and mutual TLS - https://docs.docker.com/engine/swarm/how-swarm-mode-works/pki/
- Docker Docs: Swarm service networking - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Protect the Docker daemon socket - https://docs.docker.com/engine/security/protect-access/
- Docker Docs: Configure remote access for Docker daemon - https://docs.docker.com/engine/daemon/remote-access/
- Portainer Docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer Docs: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer Docs: Deprecated and removed features - https://docs.portainer.io/advanced/deprecated
- HashiCorp Vault Docs: `vault kv put` - https://developer.hashicorp.com/vault/docs/commands/kv/put

## Issues Found
- The post said `--autolock` automatically encrypts both Raft manager traffic and overlay data-plane traffic. I corrected this to Docker's documented model: Swarm control traffic uses mutual TLS by default, Raft logs are encrypted at rest by default, `--autolock` protects the manager keys after restart, and overlay data-plane encryption must be enabled per network.
- The unlock workflow included a non-interactive `docker swarm unlock` pipeline that is not documented in Docker's CLI reference. I removed it and kept the documented interactive unlock flow.
- The example for storing the unlock key in Vault used a generic `vault write` path that is backend-version-dependent for KV. I changed it to `vault kv put -mount=secret ... value=-` so it matches current Vault CLI usage.
- The network verification example attempted to ping a container that was never created and assumed a specific `docker network inspect` output rendering. I changed it to create a peer container on the attachable overlay network and made the inspection check format-agnostic.
- The Docker daemon TLS section claimed to generate CA, server, and client certificates but only created CA and server material. I updated it to generate client certificates as well, add the required server certificate extensions, and include a documented TLS verification command.
- The original Docker daemon remote-access example used `daemon.json` in a way that can conflict with systemd-managed `dockerd` `-H` flags. I replaced it with a systemd service override approach that matches Docker's current remote-access guidance for systemd-based hosts.
- The Portainer section used `docker run ... --ssl` as though it connected Portainer to a TLS-secured Swarm. That command configures Portainer's own HTTPS endpoint, not the remote Docker environment, and `--ssl` itself is deprecated. I replaced it with Portainer's documented API example for adding a remote TLS-secured environment and clarified that local-socket deployments need no extra Portainer configuration.

## Review Notes
- Docker documents that encrypted overlay networks impose a non-negligible performance penalty and should be tested before production use.
- Docker also documents that encrypted overlay networks are not supported for Windows containers.
- Swarm control-plane traffic is always encrypted, but application data on overlay networks is not encrypted unless the network is created with encryption enabled.
- Docker notes that the automatically created `ingress` network is not encrypted by default; it must be customized separately if encrypted ingress traffic is required.
