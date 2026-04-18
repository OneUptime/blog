# Validation Summary: How to Configure VXLAN with Unicast Head-End Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux VXLAN (kernel driver)
- iproute2 (`ip link`, `ip addr`)
- `bridge` command (FDB manipulation)
- VXLAN unicast head-end replication (HER)
- Overlay networking / SDN concepts (VTEP, BUM traffic)

## Sources Consulted
- RFC 7348 - Virtual eXtensible Local Area Network (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348
- iproute2 `ip-link(8)` vxlan documentation: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` manual page for FDB operations: https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux kernel VXLAN driver documentation: https://docs.kernel.org/networking/vxlan.html
- IANA service name/port registry (UDP port 4789 for VXLAN)

## Issues Found
No technical issues found.

Verified items:
- `ip link add ... type vxlan id <VNI> dstport 4789 local <IP> dev <NIC>` syntax matches iproute2 documentation.
- Omitting `group` / `remote` correctly creates a VXLAN without a default flood destination, requiring manual FDB entries.
- `bridge fdb append 00:00:00:00:00:00 dev vxlan0 dst <REMOTE> permanent` is the documented way to add per-VTEP flood entries for head-end replication. The author's note about using `append` (not `add`) for multiple zero-MAC entries is correct — `add` will fail/replace when the same MAC is reused, while `append` creates additional replication entries.
- UDP port 4789 is the correct IANA-assigned VXLAN port per RFC 7348.
- BUM (Broadcast, Unknown unicast, Multicast) terminology is used correctly.
- Sample `bridge fdb show` output format (including `self permanent`) is consistent with real kernel output.
- The trade-off table (multicast vs HER) accurately reflects the scaling cost of N-1 replication copies per BUM frame in HER.

## Review Notes
- The post could mention that MTU considerations apply (VXLAN adds 50 bytes of overhead for IPv4 outer headers / 70 for IPv6), but this is an enhancement rather than a correction.
- For persistence across reboots, the commands shown are runtime-only; a real deployment would wire these through systemd-networkd, NetworkManager, or ifupdown — noted as a future improvement but outside the scope of the tutorial.
- The recommendation at the end to use BGP EVPN or a controller for dynamic VTEP discovery is appropriate and accurate.
