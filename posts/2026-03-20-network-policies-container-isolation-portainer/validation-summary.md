# Validation Summary: How to Configure Network Policies for Container Isolation in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker (bridge, overlay, host, macvlan, none drivers)
- Docker Compose (network and service configuration)
- Docker Swarm (overlay networks, IPsec encryption)
- UFW (Uncomplicated Firewall)
- iptables
- ntopng (network traffic monitoring)
- nginx, Postgres, Traefik (referenced as example services)

## Sources Consulted
- Docker Compose specification — networks top-level element: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose specification — services networks: https://docs.docker.com/reference/compose-file/services/#networks
- Docker network drivers overview: https://docs.docker.com/engine/network/drivers/
- Docker Swarm overlay network encryption (`--opt encrypted`): https://docs.docker.com/engine/network/drivers/overlay/#encrypt-traffic-on-an-overlay-network
- ntopng Docker image documentation: https://hub.docker.com/r/ntop/ntopng
- UFW manpage / Ubuntu docs: https://help.ubuntu.com/community/UFW

## Issues Found
1. **Invalid `encrypted` key on `swarm-overlay` network (Step 2).** The Docker Compose specification does not include `encrypted` as a top-level network option. Overlay traffic encryption is enabled via the driver option `encrypted` (set under `driver_opts`). Changed `encrypted: true` at the network level to `driver_opts: { encrypted: "true" }`.
2. **Duplicate / invalid `encrypted` key on `secure-overlay` network (Step 4).** The example used both an invalid top-level `encrypted: true` and a (correct) `driver_opts.encrypted: "true"`. Removed the invalid top-level key, kept the `driver_opts` version, and consolidated the explanatory comment.
3. **Invalid YAML in Pattern 2 (Tiered Architecture).** The original wrote `data: {}` (an empty inline mapping) and then attempted to add `internal: true` as a child, which is a YAML parse error. Changed `data: {}` to `data:` so `internal: true` becomes a valid child key.

## Review Notes
- The post is titled "Network Policies for Container Isolation" and tags Kubernetes, but the content is exclusively Docker / Docker Compose / Swarm networking — Kubernetes `NetworkPolicy` resources are not covered. This is a content-scope mismatch rather than a technical inaccuracy, so it was not changed per the review guidelines.
- `version: "3.8"` in the compose file is no longer required by the Compose Specification (the `version` key is informational/ignored in modern Compose), but it is still accepted and harmless. Left as-is.
- `internal: false` on the `frontend` network is the default and therefore redundant, but valid. Left as-is.
- For the `ntopng` service, declaring `ports` while also using `network_mode: host` is redundant (host networking ignores `ports` mapping), but it is not a syntax error and Docker simply ignores the mapping. Left as-is — readers can take it as documentation of the intended port.
- Overlay-network encryption (IPsec) only encrypts traffic between nodes on overlay networks; the comment placement in Step 4 was slightly clarified but the underlying claim is correct.
