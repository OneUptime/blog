# Validation Summary: How to Migrate Portainer Data to a New Server - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- Portainer CE (2.19.4)
- Portainer Edge agents
- Docker (volumes, run, inspect)
- tar / gzip (volume backup pattern)
- rsync (transfer)
- Nginx reverse proxy (TLS termination + WebSocket upgrade)
- Portainer HTTP API (`/api/system/status`, `/api/endpoints`, `/api/users`) with `X-API-Key` auth

## Sources Consulted
- Portainer Server install (Docker on Linux): https://docs.portainer.io/start/install-ce/server/docker/linux — confirmed `/data` mount path, `portainer_data` volume, ports 8000 (Edge tunnel) and 9443 (HTTPS UI).
- Portainer agent README: https://github.com/portainer/agent — confirmed env vars (`EDGE`, `EDGE_ID`, `EDGE_KEY`, `EDGE_INSECURE_POLL`) and that `EDGE_SERVER_HOST` is the agent's own UI bind address, NOT the upstream Portainer URL. Confirmed `EDGE_KEY` format `portainer_instance_url|tunnel_server_addr|tunnel_server_fingerprint|endpoint_ID`.
- Portainer Edge Compute docs: https://docs.portainer.io/admin/environments/edge
- Portainer API auth docs: https://docs.portainer.io/api/access — confirmed `X-API-Key` header.
- Portainer 2.19.4 release: https://github.com/portainer/portainer/releases/tag/2.19.4 — released 2023-12-07.

## Issues Found
1. **Incorrect use of `EDGE_SERVER_HOST` for Edge agent migration.** The original "Handling Edge Environments" section recommended setting `EDGE_SERVER_HOST=new-portainer.example.com` via `docker service update` to repoint Edge agents at the new Portainer server. This is wrong: per the Portainer agent source/README, `EDGE_SERVER_HOST` is the address on which the agent's *own* Edge UI binds locally (default `0.0.0.0`); it does not configure the upstream Portainer server URL. The upstream URL is base64-encoded inside `EDGE_KEY`. **Fix:** rewrote the section to explain (a) the simplest path is to keep the same DNS hostname for Portainer so agents reconnect automatically, and (b) if the hostname must change, the Edge key has to be regenerated from the new Portainer instance and the agent redeployed with the new `EDGE_KEY` (showing a correct `docker run` example with `EDGE=1`, `EDGE_ID`, `EDGE_KEY`, `EDGE_INSECURE_POLL`).

## Review Notes
- Portainer CE 2.19.4 is a real release (Dec 2023) and is fine as an example version. Readers running newer Portainer should still pin the same major.minor.patch on both sides during migration; the post already states this requirement.
- The backup/restore pattern (tar of the `/data` volume via a throwaway alpine container) is the canonical approach and matches Portainer's own recommendation.
- Stopping Portainer before backing up is correct — Portainer's BoltDB-style data store is not safe to copy hot.
- The Nginx snippet correctly uses `proxy_pass https://...:9443` with `Upgrade`/`Connection` headers needed for WebSocket support (used by the Portainer console feature). Self-signed cert on the upstream may also require `proxy_ssl_verify off;` in some setups, but that's a deployment-specific concern, not an error in the post.
- `docker volume rm portainer_data` on the old server is destructive; the post correctly gates it behind "only after backup is verified."
