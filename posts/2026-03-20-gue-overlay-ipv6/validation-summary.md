# Validation Summary: How to Configure GUE Overlay with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Generic UDP Encapsulation (GUE)
- Foo-over-UDP (FOU)
- Linux kernel tunnel interfaces
- `iproute2` (`ip link`, `ip fou`, `ip tunnel`)
- IPv6 underlay tunneling with `ip6tnl`
- VXLAN
- Geneve
- `iperf3`
- `perf`
- `nstat`
- `tcpdump`

## Sources Consulted
- `ip-fou(8)` local man page and man7 mirror: https://www.man7.org/linux/man-pages/man8/ip-fou.8.html
- `ip-link(8)` local man page and man7 mirror: https://www.man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-tunnel(8)` local man page and man7 mirror: https://www.man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Local CLI help: `ip link help ip6tnl`
- Local CLI help: `ip link help ipip`
- Linux kernel FOU netlink specification: https://docs.kernel.org/6.8/networking/netlink_spec/fou.html
- Linux kernel RT link netlink specification: https://docs.kernel.org/netlink/specs/rt-link.html
- `iproute2` `link_ip6tnl.c` source mirror: https://sources.debian.org/src/iproute2/6.15.0-1/ip/link_ip6tnl.c
- GUE Internet-Draft: https://datatracker.ietf.org/doc/draft-ietf-intarea-gue/07/
- RFC 7348 (VXLAN): https://www.rfc-editor.org/rfc/rfc7348
- RFC 8926 (Geneve): https://www.rfc-editor.org/rfc/rfc8926
- RFC 8200 (IPv6): https://www.rfc-editor.org/rfc/rfc8200

## Issues Found
- The IPv4-over-IPv6 example used `type ipip` with IPv6 endpoints. I changed it to `type ip6tnl` with `mode ipip6`, because `ipip` is the IPv4-over-IPv4 tunnel type while IPv4-over-IPv6 is handled by `ip6tnl`.
- Both tunnel MTU values were incorrect. I updated them to `1448`, which matches a 1500-byte underlay MTU minus 40 bytes for outer IPv6, 8 bytes for UDP, and 4 bytes for the base GUE header.
- The overview overstated GUE as tunneling "any network protocol". I narrowed that language to IP payloads so it matches Linux GUE/FOU documentation.
- The overhead section mixed Ethernet framing with L3/L4 tunnel overhead and used inconsistent comparison numbers. I rewrote it with consistent figures for Linux GUE over IPv6 and standard VXLAN/Geneve L2 overlays.
- The `perf stat` example redirected both stdout and stderr to `/dev/null`, which would hide the `perf` results. I changed it so the measurement output remains visible.
- The `nstat` example used default delta mode while claiming to verify fragmentation directly. I changed it to inspect the absolute `Ip6FragCreates` counter explicitly.
- The conclusion referenced `ipip` for IPv6-underlay GUE tunnels and made an unqualified "lowest overhead" claim. I updated it to `ip6tnl` and qualified the overhead comparison to IP overlays.

## Review Notes
- `encap-sport auto` is still accepted by current `ip6tnl` parsing code even though some help text only shows `encap-sport PORT`.
- The MTU examples assume a 1500-byte underlay MTU, no extra IPv6 extension headers, and no extra GUE options.
- The overhead discussion reflects Linux tunnel behavior using the 4-byte GUE base header, not the zero-extra-header direct IP variant described in the GUE draft.
