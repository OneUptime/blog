# Validation Summary: How to Configure VXLAN with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- systemd-networkd (.netdev and .network unit files)
- VXLAN (Virtual eXtensible LAN) overlay networking
- Linux bridge interfaces
- `networkctl` management CLI
- `ip` and `bridge` utilities (iproute2)

## Sources Consulted
- systemd.netdev(5) man page — Debian bookworm rendering: https://manpages.debian.org/bookworm/systemd/systemd.netdev.5.en.html (VXLAN section option names, valid ranges, defaults)
- systemd.network(5) man page (for `[Network]` Bridge= and Address= semantics)
- RFC 7348 "Virtual eXtensible Local Area Network (VXLAN)" — VNI field width (24-bit), IANA UDP port 4789
- `networkctl(1)` — valid subcommands including `reload` and `status`

## Issues Found
No technical issues found.

Verified specifics:
- All `[VXLAN]` option names (VNI, Remote, Local, Group, DestinationPort, Independent, MacLearning, TTL, TOS, FlowLabel, MaximumFDBEntries, ReduceARPProxy, UDPChecksum, UDP6ZeroChecksumTx, UDP6ZeroChecksumRx) are spelled correctly and accepted by systemd-networkd.
- VNI valid range `1..16777215` matches the 24-bit VXLAN Network Identifier defined in RFC 7348.
- DestinationPort 4789 is the IANA-assigned VXLAN port.
- `Independent=` is a boolean that defaults to false, matching the post.
- `TTL=` accepts `inherit` or `0..255`; the example value `64` is valid.
- `[Bridge]` `VLANFiltering=` and `[Network]` `Bridge=` are valid option names in their respective unit types.
- `networkctl reload`, `networkctl status`, `ip -d link show`, and `bridge fdb show dev` are all valid invocations.

## Review Notes
- The comment next to `Independent=false` ("Bind to underlay interface") is slightly informal — the option technically controls whether the VXLAN device is tied to a lower/underlay device vs. standalone. It is not incorrect enough to require a change.
- `DestinationPort=` is optional; if omitted, systemd-networkd uses the Linux kernel default (historically 8472) rather than 4789. The post correctly sets it explicitly to 4789, which is the recommended IANA value for interop.
- `ReduceARPProxy=` requires a bridge with ARP suppression support on modern kernels; it is valid but only effective in bridged VXLAN topologies.
- For multi-VTEP production deployments, static FDB entries or a control plane (e.g., EVPN/BGP, FRR) are typically preferred over multicast learning, but that is outside the scope of this introductory post.
