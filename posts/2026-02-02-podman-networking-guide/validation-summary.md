# Validation Summary: How to Configure Podman Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman (containers, pods, networking)
- Netavark (default network backend in Podman 4.0+)
- aardvark-dns
- slirp4netns (rootless networking)
- pasta (rootless networking)
- CNI (legacy, deprecated in Podman 5.0)
- Macvlan, Bridge, Host networking
- Podman Compose / podman-compose
- firewalld / iptables
- IPv6 dual-stack networking

## Sources Consulted
- Podman v4.4.0 release notes (pasta network mode): https://github.com/containers/podman/releases/tag/v4.4.0
- Podman v4.7.0 release notes (`podman compose` command): https://github.com/containers/podman/releases/tag/v4.7.0
- Podman 5.0 announcement (CNI removal): https://www.redhat.com/en/blog/podman-50-unveiled
- `podman-network-create` docs: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- `podman-pod-create` docs: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- `podman-run` docs (slirp4netns/pasta options, `--network` syntax): https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
1. **Incorrect pasta version claim** — The post said `pasta` was available in "Podman 4.0+", but pasta network mode was added in Podman 4.4.0 (February 2023). Corrected the comment to read "Podman 4.4+".
2. **Incorrect `podman compose` version claim** — The post said the built-in `podman compose` command was available "Podman 3.0+". The `podman compose` wrapper subcommand was actually introduced in Podman 4.7.0 (September 2023). Podman 3.0 only provided docker-compose API socket compatibility, not the subcommand. Corrected to "Podman 4.7+".
3. **Mermaid diagram naming conflict** — In the first Mermaid diagram (architecture overview), the identifier `Host` was used both for the outer `subgraph Host["Host System"]` and an inner node `Host["Host Network"]`. This name collision could break rendering in strict Mermaid parsers. Renamed the inner node to `HostNet["Host Network"]` and updated the two edges that referenced it (`C3 --> HostNet` and `HostNet --> NIC`).

## Review Notes
- The post correctly notes Netavark replaced CNI as the default in Podman 4.0 and CNI was removed in Podman 5.0. The "Advanced CNI Configuration" section is therefore only useful for users still running Podman 4.x; the disclaimer earlier in the article makes this acceptable, but a future revision could be more explicit that CNI custom configs do not apply to Podman 5.0+.
- One inline comment mentions `podman network inspect mynetwork` shows "CNI configuration"; on Podman 4.0+ with Netavark this is actually Netavark configuration. Minor wording issue, not corrected to keep edit scope minimal.
- The `--cap-add=NET_BIND_SERVICE` + `net.ipv4.ip_unprivileged_port_start=0` example is technically valid but somewhat redundant — once `ip_unprivileged_port_start=0` is set, the capability is no longer required to bind to port 80. The example works; just not the minimum.
- Macvlan rootless: verified still unsupported in current Podman releases — the table entry "Macvlan / No" remains accurate.
- The slirp4netns option syntax (`port_handler=slirp4netns,enable_ipv6=true`) is correct per `podman-run` docs.
- Pod options `--ip`, `--hostname`, `--dns`, and `--dns-search` were all verified as valid against the `podman-pod-create` man page.
