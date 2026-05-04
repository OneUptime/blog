# Validation Summary: How to Set Up Container Network Traffic Monitoring with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker (bridge, overlay, host, macvlan, none network drivers)
- Docker Compose (v3.8 schema)
- Docker Swarm (overlay networks, IPsec encryption)
- ntopng (network traffic monitoring)
- UFW (firewall)
- iptables (Docker rules)
- Nginx / Traefik (as reverse proxy examples)
- PostgreSQL (as a sample isolated service)

## Sources Consulted
- Docker Compose specification — networks top-level element: https://docs.docker.com/reference/compose-file/networks/
- Docker overlay network driver docs (encryption via `--opt encrypted`): https://docs.docker.com/engine/network/drivers/overlay/
- Docker network drivers overview: https://docs.docker.com/engine/network/
- Docker Compose `network_mode` reference: https://docs.docker.com/reference/compose-file/services/#network_mode
- ntopng Docker image documentation: https://hub.docker.com/r/ntop/ntopng and https://www.ntop.org/guides/ntopng/
- Portainer networks documentation: https://docs.portainer.io/user/docker/networks
- UFW manual (allow/deny from CIDR syntax)

## Issues Found
1. **Invalid `encrypted` top-level network attribute (Step 2, `swarm-overlay`).** The Docker Compose specification does not define a top-level `encrypted` field on networks. Overlay encryption is enabled via the overlay driver option `encrypted` (`--opt encrypted` on the CLI, or `driver_opts.encrypted: "true"` in Compose). Replaced the invalid `encrypted: true` line with a `driver_opts: { encrypted: "true" }` block.
2. **Duplicate / invalid `encrypted` field (Step 4, `secure-overlay`).** The same `encrypted: true` was set both at the top level (invalid) and correctly inside `driver_opts`. Removed the invalid top-level entry and kept the correct `driver_opts.encrypted: "true"` form.
3. **Misleading `ports` mapping with `network_mode: host` (Step 6, `ntopng`).** Docker ignores `ports` when a service uses `network_mode: host`, and Compose will warn or reject this combination depending on version. Removed the `ports` key and added a comment noting the web UI is reachable on the host's port 3000 directly.
4. **YAML syntax error (Pattern 2 — Tiered Architecture).** `data: {}` followed by an indented `internal: true` is not valid YAML — once a node is given a flow-style empty mapping (`{}`), child block keys cannot be appended. Replaced `data: {}` with `data:` so `internal: true` is the actual mapping value.

## Review Notes
- The post is titled "Container Network Traffic Monitoring with Portainer" and the description mentions Weave Scope, ntopng, and custom monitoring solutions, but only ntopng gets a small example; Weave Scope is not actually demonstrated and the bulk of the post is about network architecture and segmentation rather than traffic monitoring. This is a content/scope mismatch but not a technical inaccuracy, so it was left alone per the review scope.
- The `version: "3.8"` Compose top-level key is now considered obsolete by the Compose Specification (Compose v2 ignores it). It still works and is harmless, so it was left in place.
- `macvlan` is listed as "Multi-Host: No". macvlan itself is per-host, but containers across hosts can share the same upstream L2 segment if the underlying network supports it; the table's simplified answer is acceptable for an introductory overview.
- The `iptables -L -n -v | grep DOCKER` example is correct for legacy iptables; on hosts using `nftables` natively (without the iptables-nft compatibility layer), `nft list ruleset` would be preferred. Not changed because most Docker hosts still use the iptables-nft shim.
