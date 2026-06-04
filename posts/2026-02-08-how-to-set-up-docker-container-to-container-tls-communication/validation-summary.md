# Validation Summary: How to Set Up Docker Container-to-Container TLS Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Swarm secrets
- TLS and mutual TLS
- OpenSSL
- Nginx
- curl
- tcpdump

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Docker Compose CLI reference - https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: Compose secrets reference - https://docs.docker.com/reference/compose-file/secrets/
- Nginx Docs: ngx_http_ssl_module - https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx Docs: ngx_http_rewrite_module - https://nginx.org/r/if
- PostgreSQL Docs: Secure TCP/IP Connections with SSL - https://www.postgresql.org/docs/current/ssl-tcp.html
- OpenSSL local CLI help: `openssl req -help`, `openssl x509 -help`
- curl local CLI help: `curl --help all`

## Issues Found
- The Nginx example used `ssl_verify_client off` inside a `location` block. Nginx only supports `ssl_verify_client` in `http` and `server` contexts, so the configuration would fail to load. Changed the server to `ssl_verify_client optional` and added a per-location check using `$ssl_client_verify`.
- The Nginx response used `$ssl_client_s_dn_cn`, which is not a valid Nginx SSL variable. Changed the response to use `$ssl_client_s_dn` and updated the expected output to show the full subject DN.
- The health check exemption was incompatible with server-wide required client certificates. The revised optional verification preserves `/health` without a client certificate while enforcing verified client certificates on `/`.
- The Docker Compose example included a PostgreSQL service that was not a working TLS setup: PostgreSQL requires `ssl=on`, valid server certificate/key paths or defaults, suitable key permissions, and `hostssl`/client certificate settings in `pg_hba.conf`. Removed the unused inaccurate service from the Compose example.
- The commands used `docker exec api-client` and `docker exec web-service`, but Compose service names are not guaranteed container names. Changed these examples to `docker compose exec <service>`.
- The `curlimages/curl` container runs as a non-root user, while the generated private key is not readable by that user when bind-mounted. Added `user: root` to the demo client service so the tutorial commands work with the generated key.
- The Swarm secrets example mounted secrets at their default paths while the Nginx config expected `/etc/nginx/certs/...`. Changed the service secrets to use explicit `target` paths.
- The tcpdump command inspected `secure-network` directly, but Compose creates project-prefixed network names. Changed the command to derive the network ID from the running `web-service` container.

## Review Notes
Validated the corrected OpenSSL certificate flow, Nginx configuration syntax using the official `nginx:alpine` image, and the end-to-end Docker Compose mTLS request path in a temporary stack. The test returned the expected JSON for a valid client certificate and HTTP 403 without one.
