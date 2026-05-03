# Validation Summary: How to Create a VXLAN Interface with ip link type vxlan

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN) — RFC 7348
- Linux `iproute2` / `ip link` command
- `bridge fdb` command (forwarding database)
- systemd-networkd (`.netdev` and `.network` files)
- Linux networking / overlay networks
- UDP encapsulation

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348
- `ip-link(8)` man page — VXLAN type section: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` man page — fdb subcommand: https://man7.org/linux/man-pages/man8/bridge.8.html
- `systemd.netdev(5)` man page — `[VXLAN]` section: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network(5)` man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- IANA Service Name and Transport Protocol Port Number Registry (UDP 4789 = vxlan)

## Issues Found
No technical issues found.

The post is accurate across all sections:
- VXLAN encapsulates Layer 2 Ethernet frames in UDP — matches RFC 7348.
- The `ip link add ... type vxlan id <VNI> remote <IP> local <IP> dev <DEV> dstport 4789` syntax is correct per `ip-link(8)`.
- UDP port 4789 is the IANA-assigned VXLAN port (the Linux kernel historically defaulted to 8472, but the `ip` command since iproute2 commits aligned to 4789 — explicitly setting `dstport 4789` is the recommended, portable approach).
- The multicast variant using `group 239.1.1.1` is valid (administratively-scoped multicast range).
- The example output line `srcport 0 0 dstport 4789` is correct — `srcport` is a min/max range pair; `0 0` means the kernel chooses an ephemeral source port (default behavior).
- `bridge fdb add 00:00:00:00:00:00 dev vxlan10 dst 192.168.1.3` correctly registers a remote VTEP for BUM (broadcast / unknown-unicast / multicast) traffic — the all-zeros MAC is the documented sentinel for default VTEP entries.
- The `systemd.netdev` `[VXLAN]` keys (`VNI`, `Remote`, `Local`, `DestinationPort`) and `[NetDev]` keys (`Name`, `Kind=vxlan`) match the systemd documentation.
- The `.network` file (`[Match] Name=` and `[Network] Address=`) is valid.
- `ip link set <dev> down` followed by `ip link delete <dev>` is the correct teardown sequence.

## Review Notes
- The kernel's historical default `dstport` was 8472 (pre-IANA assignment). The post correctly uses 4789 (the IANA-standard port) and explicitly sets it, which is the right modern recommendation.
- For multicast VXLAN, the underlay network must support IP multicast (PIM/IGMP) — worth noting for readers in cloud environments where multicast is typically unavailable, but this is contextual rather than incorrect.
- For unicast (head-end replication) deployments at scale, EVPN/BGP control planes are typically used instead of static `bridge fdb` entries, but the static-FDB approach shown is correct for small/lab setups.
- The example output is condensed; real `ip -d link show` output also includes `link/ether ...`, MTU (typically 1450 to account for VXLAN's 50-byte overhead), and additional flag fields, but the abbreviated form is fine for illustration.
