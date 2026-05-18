# Validation Summary: How to Set Up Outline VPN for Team Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Outline VPN (Jigsaw / Outline Foundation)
- Shadowsocks proxy protocol
- Docker
- Ubuntu (20.04 / 22.04)
- UFW firewall
- Outline Server management REST API
- Outline Manager desktop application

## Sources Consulted
- Outline Server GitHub repository: https://github.com/Jigsaw-Code/outline-server
- Outline Server install script: https://raw.githubusercontent.com/Jigsaw-Code/outline-server/master/src/server_manager/install_scripts/install_server.sh
- Outline Server API spec (api.yml): https://github.com/Jigsaw-Code/outline-server/blob/master/src/shadowbox/server/api.yml
- Official Outline website: https://getoutline.org/ and https://getoutline.org/get-started/

## Issues Found
1. **Incorrect Docker container name (`outline-shadowbox`)** — The install script creates a container named `shadowbox` by default (set via `export CONTAINER_NAME="${CONTAINER_NAME:-shadowbox}"`), not `outline-shadowbox`. All `docker inspect/logs/stats/start` commands used the wrong name and would fail. Fixed by replacing every occurrence of `outline-shadowbox` with `shadowbox`, and updating `docker ps | grep outline` to `docker ps | grep shadowbox`.

2. **"Using a Custom Port" section used the wrong environment variable** — The post used `SB_API_PORT=8080` and claimed this would change the access keys port (the one defaulting to 443). In reality `SB_API_PORT` (and the `--api-port` flag) sets the **management API** port; the access keys port is controlled by `--keys-port`. The post also implied access keys default to 443, but both ports are random by default — port 443 is a convention often selected in the Outline Manager UI. Rewrote the section to use `--api-port` and `--keys-port` flags and clarified the default-port behavior.

3. **Invalid `--skip-config-gen` flag in the restore instructions** — The install script only supports `--hostname`, `--api-port`, and `--keys-port`. There is no `--skip-config-gen` flag. Rewrote the restore guidance to describe the actual behavior: if the persisted state files already exist in `/opt/outline/persisted-state/`, the install script reuses them rather than regenerating.

## Review Notes
- API endpoints (`/access-keys`, `/access-keys/{id}/data-limit` PUT, `/access-keys/{id}` DELETE, `/metrics/transfer` GET) were verified against the OpenAPI spec in the upstream repo and are correct.
- The install script URL `https://raw.githubusercontent.com/Jigsaw-Code/outline-server/master/src/server_manager/install_scripts/install_server.sh` was verified to return a valid bash script.
- The `getoutline.org/get-started/` link is correct (note: `getoutline.org` is the Outline VPN project; the unrelated `getoutline.com` is a different product — a wiki/knowledge-base tool).
- The post correctly notes Shadowsocks uses both TCP and UDP and that UFW must allow UDP for clients to work properly.
- The author's claim that the install script runs the container with `--network=host` is accurate per the upstream script.
- Ubuntu 20.04 reaches end of standard support in May 2025; readers running on it may want to upgrade to 22.04 or 24.04. Not corrected because the post explicitly targets 20.04/22.04 and the instructions still work on 20.04.
