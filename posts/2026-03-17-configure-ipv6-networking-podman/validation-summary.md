# Validation Summary: How to Configure IPv6 Networking in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container networking
- IPv6
- Podman custom bridge networks
- Linux sysctl IPv6 settings
- Unique Local IPv6 Addresses

## Sources Consulted
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `--ip6` option documentation: https://docs.podman.io/en/v4.3/markdown/options/ip6.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/rfc4193/
- IANA IPv6 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv6-special-registry

## Issues Found
- The post attempted to run `ip -6 addr show`, `ip -6 route show`, and `ping -6` inside the `nginx:latest` container. The official nginx image is not intended as a network troubleshooting image and these tools are not guaranteed to be present. Changed the connectivity and route checks to run an Alpine utility container on the same Podman network.
- The post described ULA addresses as `fd00::/8`. RFC 4193 and IANA define ULA as `fc00::/7`; `fd00::/8` is the locally assigned ULA subset commonly used in practice. Updated the ULA section and summary to distinguish the standard range from the locally assigned subset.

## Review Notes
Podman's current documentation describes `--ipv6` as enabling dual-stack networking and confirms `--subnet`, `--gateway`, `--ip6`, Go-template formatting for `podman network inspect`, and DNS-enabled custom bridge network behavior. Port publishing syntax and IPv6 bind examples are consistent with Podman's `--publish` option, though exact host reachability still depends on the host's IPv6 routing and firewall configuration.
