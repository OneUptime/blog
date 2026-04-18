# Validation Summary: How to Use VXLAN for VM-to-VM Communication Across Hosts

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- VXLAN (Virtual eXtensible LAN) — RFC 7348
- Linux `iproute2` (`ip link`, `ip tuntap`, `ip addr`, `ip route`)
- Linux bridges
- KVM / QEMU (`qemu-system-x86_64`)
- tap interfaces
- IP multicast (VTEP discovery)
- tcpdump
- sysctl (`net.ipv4.ip_forward`)

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348
- IANA Service Name and Transport Protocol Port Number Registry (UDP 4789 assigned to VXLAN): https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- iproute2 `ip-link(8)` manpage, VXLAN type: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-tuntap(8)` manpage: https://man7.org/linux/man-pages/man8/ip-tuntap.8.html
- QEMU Networking documentation (tap backend): https://www.qemu.org/docs/master/system/devices/net.html
- tcpdump(1) manpage: https://www.tcpdump.org/manpages/tcpdump.1.html
- IANA IPv4 Multicast Address Space Registry (239.0.0.0/8 organization-local scope, RFC 2365): https://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml

## Issues Found
- **Invalid tcpdump flag combination (line 89):** The command `tcpdump -i eth0 -nn -r /tmp/cap.pcap udp port 4789 | grep "VXLAN"` combined `-i` (live capture interface) with `-r` (read from file), which are mutually exclusive — and `/tmp/cap.pcap` was never produced earlier in the post (no prior `-w` step). Replaced with a verbose live capture `tcpdump -i eth0 -nn -vv udp port 4789`, which triggers modern tcpdump's built-in VXLAN dissector and displays the inner Ethernet/IP headers as intended.

## Review Notes
- VXLAN UDP port 4789, iproute2 VXLAN creation syntax, multicast group `239.1.1.10` (valid within the 239.0.0.0/8 organization-local scope), bridge + tap wiring, QEMU `-netdev tap` usage, and the `net.ipv4.ip_forward` sysctl are all accurate.
- The "Inter-VXLAN Routing" step is presented as a brief pointer rather than a complete walkthrough: assigning a gateway IP to `br-vm` and enabling forwarding covers egress out of a single VNI; genuine inter-VNI routing would require a second bridge per additional VNI with IPs on each. The author's wording ("add a router VM or assign an IP to the bridge interface and enable forwarding") leaves this open-ended and is not incorrect, but readers pursuing multi-VNI routing will need to extrapolate.
- Minor flow observation (not an error): the VM default route `via 192.168.100.1` in Step 4 only resolves once the gateway IP is assigned to `br-vm` in the final section. Connectivity between VM1 and VM1' via `ping 192.168.100.11` does not depend on this, since they are in the same subnet.
- Multicast-based VTEP discovery requires the underlay to actually forward multicast (e.g., IGMP snooping or PIM on the physical fabric). For flat L2 lab setups this usually "just works"; on real networks, operators may need to fall back to static FDB entries or a head-end replication list, as the Key Takeaways note.
