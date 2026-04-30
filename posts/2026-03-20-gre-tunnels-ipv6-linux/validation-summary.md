# Validation Summary: How to Configure GRE Tunnels for IPv6 on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2` (`ip tunnel`, `ip -6 tunnel`, `ip link`, `ip addr`, `ip route`)
- GRE and IP6GRE tunneling
- IPv6 routing
- `systemd-networkd`
- FRR OSPFv3 (`ospf6d`)
- `iptables` / `ip6tables`
- `tcpdump`

## Sources Consulted
- `iproute2` local documentation: `ip tunnel help`, `ip -6 tunnel help`, and `man ip-link(8)` for GRE and IP6GRE command syntax.
- `systemd.netdev` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- FRR `ospf6d` official documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The overview described GRE as if it always used IPv4 protocol 47. This was corrected to clarify that protocol 47 applies when GRE uses IPv4 as the delivery protocol.
- The comparison table described SIT routing protocol support as "Limited". This was changed to `IPv6 only` because SIT can carry IPv6 routing traffic, but only IPv6 payloads.
- The GRE6 example used `ip tunnel add ... mode ip6gre`, but `ip6gre` is configured with `ip -6 tunnel add` in `iproute2`. The command was corrected accordingly.
- The GRE6 example assigned `2001:db8:via6::/64` directly to the interface. This was changed to `2001:db8:via6::1/64` to use a normal unicast interface address instead of the all-zero interface identifier.
- The FRR example used `ospf6-id`, which is not the documented FRR command. It was corrected to `ospf6 router-id`.
- The FRR example also included `interface gre1 area 0.0.0.0` under `router ospf6`, which does not match FRR's documented OSPFv3 configuration model. The interface-level OSPFv3 configuration was left under `interface gre1`, where FRR documents it.
- The summary was updated to distinguish `ip tunnel add` for GRE over IPv4 from `ip -6 tunnel add` for `ip6gre`.

## Review Notes
- The `iptables` and `ip6tables` examples are still technically valid, but many Linux distributions now prefer `nftables` or iptables-nft backends.
- The `1476` MTU guidance is correct for a 1500-byte IPv4 underlay with a base GRE header; keyed or checksummed GRE adds additional overhead.
- The routing example was validated against current FRR documentation. Older Quagga deployments may differ.
