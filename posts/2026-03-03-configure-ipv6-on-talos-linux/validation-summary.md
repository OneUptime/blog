# Validation Summary: How to Configure IPv6 on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl CLI)
- IPv6 networking (SLAAC, DHCPv6, static addressing, RA, privacy extensions)
- Kubernetes pod/service networking
- CNI plugins (Flannel, Cilium, Calico)
- Linux kernel IPv6 sysctls

## Sources Consulted
- [Talos v1.7 configuration reference](https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/) — verified `machine.network.interfaces`, `dhcpOptions.ipv6`, `routes`, and `nameservers` schema
- [Talos v1.7 talosctl CLI reference](https://docs.siderolabs.com/talos/v1.7/reference/cli) — verified `talosctl get`, `logs`, `read`, `dmesg`, `pcap` commands and flags
- [Sidero Labs IPv4/IPv6 dual-stack discussion #8228](https://github.com/siderolabs/talos/discussions/8228) — verified dual-stack pod/service subnet configuration
- [Talos pcap discussion #8915](https://github.com/siderolabs/talos/discussions/8915) — verified `--interface`, `--bpf-filter`, `--duration`, `-o` flags
- [RFC 3849](https://datatracker.ietf.org/doc/html/rfc3849) — IPv6 documentation prefix (2001:db8::/32) reservations
- [RFC 4193](https://datatracker.ietf.org/doc/html/rfc4193) — ULA fd00::/8 prefix used for the corrected examples
- [Linux kernel ip-sysctl.txt](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt) — verified IPv6 sysctls (accept_ra, autoconf, disable_ipv6, use_tempaddr)

## Issues Found

1. **Invalid IPv6 addresses in the Kubernetes pod/service CIDR examples** — The post used `2001:db8:pod::/48` and `2001:db8:svc::/112`. These are not valid IPv6 addresses because IPv6 hextets must only contain hex characters (0-9, a-f). The letters 'p', 'o', 's', and 'v' are not valid hex. A user copy-pasting these would get a parse error when Talos tries to apply the config.
   - Fix: Replaced with valid ULA examples that match common Talos IPv6 documentation patterns: `fd00:10:244::/48` for pods and `fd00:10:96::/112` for services. The Cilium `clusterPoolIPv6PodCIDRList` example was updated the same way for consistency.

## Review Notes

- The `talosctl pcap` filter `"icmp6 and ip6[40] == 134"` is technically correct (ICMPv6 RA type = 134, IPv6 header is fixed 40 bytes), though it only works when no IPv6 extension headers are present. Left as-is since RA packets in practice do not carry extension headers and this is a common pattern.
- The example uses the documentation prefix `2001:db8::/32` (RFC 3849) for host-level static addresses, which is correct.
- The post's claim that Talos's default CNI is Flannel and that Flannel has limited IPv6 support is accurate.
- The `dhcpOptions.ipv6: true` field is correctly named per the Talos v1alpha1 schema (it defaults to disabled).
- `talosctl get neighbors`, `talosctl get resolvers`, `talosctl get addresses`, and `talosctl get routes` are all valid COSI resource queries in Talos.
- `ping6` is provided by recent busybox builds (it works in the upstream `busybox` image as of recent tags).
- The `cluster.network.cni.name: custom` value is the correct Talos schema value for opting out of the bundled CNI (alongside `flannel` and `none`); `custom` is documented for users supplying their own CNI manifests.
