# Validation Summary: How to Set Up Docker Compose with IPv6 Networks

## Status
validated

## Post Type
Tutorial / Guide (step-by-step configuration walkthrough)

## Technologies Covered
- Docker Engine / Docker daemon (`daemon.json`)
- Docker Compose V2 (Compose file format)
- IPv6 networking (ULA `fd00::/8`, GUA `2000::/3`, link-local `fe80::/10`)
- Docker network drivers: bridge, macvlan, ipvlan
- `ip6tables` / Linux IPv6 sysctl configuration
- Traefik, PostgreSQL, Redis, Prometheus, Grafana (used in example stacks)

## Sources Consulted
- Docker — Use IPv6 networking (daemon): https://docs.docker.com/engine/daemon/ipv6/
- Docker Compose — Networks top-level element / IPv6 (`enable_ipv6`, `ipam`): https://docs.docker.com/reference/compose-file/networks/
- Docker Compose — Services `ports` long/short syntax: https://docs.docker.com/reference/compose-file/services/
- RFC 4193 — Unique Local IPv6 Unicast Addresses (`fc00::/7`, `fd00::/8`)
- RFC 4291 — IP Version 6 Addressing Architecture (address text representation / hexadecimal notation)
- `docker network create` CLI reference (`--ipv6`, `--subnet`, `--gateway`): https://docs.docker.com/reference/cli/docker/network/create/

## Issues Found

1. **Invalid IPv6 addresses using non-hexadecimal characters (multiple code blocks).**
   IPv6 address text representation only permits hexadecimal digits (`0-9`, `a-f`) per RFC 4291. Several examples used English words as address groups that contain illegal characters, which Docker rejects as "invalid CIDR address" / "invalid argument". Fixed by substituting valid-hex groups while preserving each example's internal consistency (subnet, gateway, and per-service addresses kept in agreement):
   - `fd00:shared::` → `fd00:5ed::` (Step 5 external network: `docker network create`, both Compose projects); `fd00:shared::redis` → `fd00:5ed::5`.
   - `fd00:bridge::` → `fd00:b::` (Step 6 bridge driver).
   - `fd00:dns::` → `fd00:d::` (Step 8 service discovery).
   - `fd00:app::` → `fd00:a::` (Step 9 health checks and Step 11 debugging commands).
   - `fd00:secure::` → `fd00:5ec::` (Step 12 network isolation).
   - `fd00:mon::` → `fd00:6::` (Step 10 monitoring network: subnet, gateway, Prometheus, Grafana).
   (Valid hex labels already in the post — `dead:beef`, `cafe`, `fd00:fe`, `fd00:be`, `fd00:db` — were left unchanged.)

2. **Incorrect daemon verification command (Step 1 and Troubleshooting checklist).**
   The post claimed `docker info | grep -i ipv6` should show `IPv6 Enabled: true`. `docker info` does not emit an "IPv6 Enabled" field (confirmed against the official Docker IPv6 daemon docs, which make no mention of it). Replaced with a reliable check: `docker network inspect bridge --format '{{.EnableIPv6}}'` (expecting `true`), and updated the matching checklist item to `docker network inspect bridge` shows `EnableIPv6: true`.

3. **Broken Docker socket bind mount (Step 10, Traefik service).**
   `- /var/run/docker.sock:ro` parses as `source:target` (mounting the socket to a container path literally named `ro`), not a read-only mount. Corrected to the full `source:target:mode` form: `- /var/run/docker.sock:/var/run/docker.sock:ro`.

4. **`DATABASE_URL` pointing at the wrong container.**
   - Step 4: the URL targeted `[fd00:3::30]` (the worker's own database-network address) instead of the `postgres` container at `fd00:3::40`. Fixed.
   - Step 10: both the `api` and `worker` `DATABASE_URL` values targeted `[fd00:db::20]` (the worker's address) instead of the `postgres` container at `fd00:db::30`. Fixed both.

## Review Notes
- `version: "3.8"` is retained throughout. It is obsolete in Compose V2 (Compose ignores it and may print a warning) but is not an error, so it was left as-is to avoid stylistic changes.
- In the basic Step 3 example, a service publishes both `"80:80"` and `"[::]:80:80"`. With the default userland proxy, `"80:80"` already binds the IPv6 wildcard, so the second mapping can collide ("address already in use") depending on daemon settings. Left unchanged — it is illustrative of explicit IPv6 binding and behavior is configuration-dependent — but readers should be aware of the potential overlap.
- `"experimental": false` in the advanced daemon config is unrelated to IPv6 and unnecessary on current Docker (where `ip6tables` is stable, no longer requiring experimental mode). Harmless, left as-is.
- The `ip6tables` firewall script broadly accepts `fd00::/8`; in production, scoping to the specific Docker-allocated subnets is preferable. Not incorrect, noted for future hardening.
- All container image tags referenced (`traefik:v3.0`, `postgres:16`/`16-alpine`, `redis:7-alpine`, `prom/prometheus:v2.50.0`, `grafana/grafana:10.3.0`, `nginx:alpine`, `node:20-alpine`, `python:3.12-slim`) are valid, existing tags.
