# Validation Summary: How to Set Up Multi-Host Networking with Portainer and Docker Swarm (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker / Docker Swarm
- Docker Compose (v3.8 schema)
- Overlay, bridge, host, macvlan, none network drivers
- UFW (Uncomplicated Firewall)
- iptables
- nginx, Traefik (referenced as reverse proxy)
- ntopng (network monitoring)
- jq, nslookup, ping, curl (debugging utilities)

## Sources Consulted
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker overlay driver / encryption docs: https://docs.docker.com/engine/network/drivers/overlay/
- Docker network drivers overview: https://docs.docker.com/engine/network/
- Docker `network create` CLI: https://docs.docker.com/reference/cli/docker/network/create/
- Portainer documentation: https://docs.portainer.io/

## Issues Found

1. **Invalid `encrypted` top-level network property in Step 2 (`swarm-overlay`).** The Compose spec does not define an `encrypted` attribute on a network; overlay encryption is enabled via `driver_opts.encrypted: "true"` (which maps to `docker network create --opt encrypted`). Replaced the bare `encrypted: true` line with a `driver_opts` block setting `encrypted: "true"`.

2. **Duplicated/invalid `encrypted` field in Step 4 (`secure-overlay`).** The example set both a top-level `encrypted: true` (invalid) and `driver_opts.encrypted: "true"` (correct). Removed the invalid top-level field and kept only the `driver_opts` form, which is the documented way to enable IPsec encryption on overlay networks.

3. **Invalid YAML in "Pattern 2: Tiered Architecture".** The original snippet used `data: {}` (an empty inline flow mapping) followed by an indented `internal: true`, which is a YAML parse error — a flow mapping cannot be extended with block-style children. Replaced `data: {}` with `data:` so `internal: true` becomes a valid child key.

## Review Notes
- The `version: "3.8"` declaration in Step 2 is still parseable but the Compose Specification has deprecated the top-level `version` key (Compose now ignores it). The post predates a future cleanup but is not technically wrong today; left as-is to preserve the author's voice.
- The `ntopng` example uses `network_mode: host` together with a `ports:` mapping. When `network_mode: host` is set, port mappings are ignored by the engine — the `ports` block is redundant but not erroneous, so left as-is.
- The Prerequisites mention "Docker or Kubernetes environment connected" — the post itself is Swarm/Compose-focused, so the Kubernetes reference is broader than needed but accurate as a Portainer prerequisite.
- The `swarm-overlay` and `secure-overlay` examples will only successfully apply on a Swarm-mode manager node; mentioning that explicitly would help readers, but the existing context (Portainer + Docker Swarm) implies it.
