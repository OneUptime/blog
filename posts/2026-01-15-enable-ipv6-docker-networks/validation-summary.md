# Validation Summary: How to Enable IPv6 in Docker Networks

## Status
validated

## Post Type
Tutorial / Guide (hands-on configuration walkthrough)

## Technologies Covered
- Docker Engine (daemon.json configuration, `dockerd`)
- Docker networking (bridge, macvlan, ipvlan, overlay drivers)
- Docker Compose (services, networks, IPAM, secrets, healthchecks)
- Docker Swarm (overlay networks, services)
- IPv6 addressing (GUA, ULA, documentation prefix)
- Linux networking (`sysctl`, `ip`, `ip6tables`, UFW, firewalld)
- Cloud container platforms (AWS ECS awsvpc, GKE, Azure AKS)
- GitHub Actions (CI workflow)

## Sources Consulted
- Docker IPv6 networking docs — https://docs.docker.com/engine/daemon/ipv6/
- Docker daemon configuration reference (daemon.json) — https://docs.docker.com/reference/cli/dockerd/
- `docker network create` reference — https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose networks / IPAM specification — https://docs.docker.com/reference/compose-file/networks/
- Docker Engine v27 release notes (ip6tables / IPv6 promoted from experimental to stable)
- RFC 3849 (IPv6 `2001:db8::/32` documentation prefix)
- RFC 4193 (Unique Local IPv6 Unicast Addresses, `fc00::/7` / `fd00::/8`)
- GKE dual-stack networking — `gcloud container clusters create --stack-type` / `--enable-ip-alias`
- Azure AKS dual-stack — `az aks create --ip-families`

## Issues Found
No technical issues found. All commands, daemon/Compose configuration keys, network-driver options, firewall rules, and cloud-provider flags were verified as syntactically correct and current. No edits were required.

## Review Notes
- **`ip6tables` + `experimental: false`:** Correct for current Docker. In Docker Engine versions prior to v27.0 (June 2024), the `ip6tables` option required `"experimental": true`. The post targets current/modern Docker, where IPv6 and `ip6tables` are stable, so the combination shown is accurate. Readers on older engines would need to enable experimental mode.
- **`version: "3.9"` in Compose files:** Still parsed correctly, but the top-level `version` field is obsolete/ignored under Compose Specification (Compose v2). It is harmless and not a technical error; it could be dropped in a future revision.
- **Overlay-network IPv6 (Swarm):** The `docker network create --driver overlay --ipv6 ...` command is syntactically valid. Historically, IPv6 on overlay networks has had more limited/edge-case support than bridge networks; the example is correct as written but readers should validate end-to-end IPv6 routing in their Swarm environment.
- **ULA reference `fd00::/8`:** Technically the full ULA block is `fc00::/7`; `fd00::/8` is the locally-assigned half (L-bit set) that is actually used in practice. The post's later guidance to generate a random `fdXX:XXXX:XXXX::/48` prefix is the correct, RFC 4193-aligned approach.
- **Documentation prefixes:** Uses `2001:db8::/32` (RFC 3849) consistently for examples, with an explicit note to replace with a real allocation in production — good practice.
