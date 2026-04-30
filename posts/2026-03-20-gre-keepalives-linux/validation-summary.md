# Validation Summary: How to Enable GRE Keepalives on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux GRE tunnels
- iproute2 (`ip tunnel`, `ip link`)
- FRRouting (FRR)
- BFD
- OSPF
- systemd-networkd
- IPv4 tunneling

## Sources Consulted
- Linux `ip-tunnel(8)` man page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Linux `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- FRR BFD documentation: https://docs.frrouting.org/en/latest/bfd.html
- FRR OSPFv2 documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRR Basic Setup documentation: https://docs.frrouting.org/en/stable-7.4/setup.html
- systemd.network manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd.netdev manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- RFC 5880: Bidirectional Forwarding Detection: https://www.rfc-editor.org/rfc/rfc5880.html
- RFC 2784: Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784

## Issues Found

1. **BFD example was incomplete for FRR daemon startup**: The post enabled `bfdd` in `/etc/frr/daemons` but did not restart FRR afterward, so the `bfd` configuration node would not be available in `vtysh` as written. Added `systemctl restart frr`.

2. **BFD peer example did not explicitly enable the peer**: FRR's BFD documentation uses `no shutdown` on configured peers. Added `no shutdown` so the example matches FRR's documented active peer configuration.

3. **The OSPF example did not actually enable OSPF on the tunnel**: The original snippet only changed hello/dead timers on `gre1`. Added `ospfd=yes`, `systemctl restart frr`, and `ip ospf area 0` so the example actually enables OSPF on the GRE interface.

4. **The ping-script section title overstated `ip tunnel` capabilities**: The original heading implied `ip tunnel` provided the dead-peer detection mechanism, but the example actually uses `ping` in a shell loop. Renamed the section to `Ping-Based Dead Peer Detection`.

5. **The `systemd-networkd` configuration snippet was invalid**: `BindCarrier=` belongs in the `[Network]` section of a `.network` file, not in a `[Tunnel]` section there. Removed the invalid `[Tunnel]` section and placed `BindCarrier=eth0` under `[Network]`.

6. **The `systemd-networkd` section overstated failure-detection scope**: `BindCarrier=` tracks the carrier state of the listed underlay interface(s); it does not probe remote GRE peer reachability. Clarified that this method only reacts to local underlay link loss.

7. **One key takeaway used inaccurate terminology**: The original summary said to use "application-layer detection" instead, but BFD and routing-protocol hellos are control-plane mechanisms, not application-layer keepalives. Updated the wording to "control-plane or higher-layer detection."

## Review Notes
- The core claim that Linux GRE lacks native Cisco-style GRE keepalives is consistent with current `iproute2` documentation and current `ip tunnel`/`ip link help gre` syntax, which expose GRE parameters such as keys, checksums, TTL, and encapsulation but no GRE keepalive option.
- `systemd-networkd` can manage tunnel state relative to local carrier loss, but it is not a substitute for end-to-end liveness detection. For remote failure detection, BFD, routing-protocol timers, or active probes are still the relevant approaches.
- The corrected FRR examples assume a systemd-based Linux distribution using the packaged `frr` service, which matches the surrounding `apt install frr` example in the post.
