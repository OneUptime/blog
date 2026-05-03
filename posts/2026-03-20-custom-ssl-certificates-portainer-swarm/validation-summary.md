# Validation Summary: How to Set Up Custom SSL Certificates in Portainer on Docker Swarm

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer CE (2.x)
- Portainer Agent
- Docker Swarm
- Docker Secrets
- SSL/TLS
- OpenSSL (for certificate verification)
- YAML (Compose v3.8 stack file)

## Sources Consulted
- Portainer official Swarm install docs: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Official Portainer agent stack file: https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml
- Portainer CLI flag definitions (source): https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Docker Swarm secrets documentation: https://docs.docker.com/engine/swarm/secrets/
- Docker stack deploy reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Swarm service discovery (`tasks.<service>`): https://docs.docker.com/engine/swarm/networking/

## Issues Found
1. **Deprecated Portainer CLI flags**: The post used `--ssl`, `--sslcert`, and `--sslkey`. These flags still work in Portainer CE 2.x but are marked deprecated in the source (`api/cli/cli.go`). The modern, non-deprecated equivalents are `--tlscert` and `--tlskey` (and there is no separate enable flag — providing the cert/key starts the HTTPS server on `9443`).
   - **Fix**: Replaced `--ssl`, `--sslcert`, `--sslkey` in the stack `command:` block with `--tlscert` and `--tlskey`. Removed the bare `--ssl` flag since it is no longer required.

## Review Notes
- All other technical details verified against Portainer's official agent stack file and source code:
  - Port `9443` is the correct default HTTPS port for Portainer CE 2.x.
  - Port `9001` is the correct default Portainer agent port.
  - `tcp://tasks.agent:9001` matches the official Swarm stack exactly.
  - `--tlsskipverify` is a valid flag used to skip TLS verification when connecting to the agent.
  - Agent volume mounts (`/var/run/docker.sock` and `/var/lib/docker/volumes`) match the official stack.
  - `external: true` for pre-created secrets is correct Compose v3.8 syntax.
  - Docker secrets are mounted at `/run/secrets/<secret_name>` by default — correct.
  - Docker secrets are immutable, so the rotation pattern (versioned secret names + redeploy) shown in the post is the correct approach.
- The `openssl s_client` verification command is syntactically correct and will print the certificate subject and expiry as described.
- Future caveat: if Portainer changes the default behavior or removes the deprecated flags entirely, this post may need re-validation.
