# Validation Summary: How to Configure a VXLAN with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Linux networking
- systemd-networkd
- VXLAN (Virtual Extensible LAN)
- `.netdev` and `.network` configuration files
- iproute2 (`ip` command)
- Linux bridges
- IP multicast

## Sources Consulted
- systemd.netdev(5) manpage — https://www.freedesktop.org/software/systemd/man/systemd.netdev.html (specifically the [VXLAN] section reference)
- systemd.network(5) manpage — https://www.freedesktop.org/software/systemd/man/systemd.network.html
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN), which specifies the IANA-assigned UDP port 4789
- iproute2 documentation for `ip link` and `ip addr` commands
- IANA Service Name and Transport Protocol Port Number Registry (VXLAN port assignment)

## Issues Found
No technical issues found.

All configuration directives, value ranges, and command syntax in the post are accurate and align with systemd-networkd documentation:

- `Kind=vxlan` in `[NetDev]` is correct
- `[VXLAN]` section keys (`VNI`, `Remote`, `Local`, `Group`, `DestinationPort`, `TOS`, `TTL`) match the manpage
- VNI range (1–16777215) is the correct 24-bit value space
- IANA port 4789 is the official VXLAN port per RFC 7348
- `.network` file with `[Match]` and `[Network]` sections is the correct format
- `Bridge=br0` directive correctly attaches the VXLAN interface as a bridge port
- Verification commands (`ip -d link show`, `ip addr show`, `systemctl restart systemd-networkd`) are valid

## Review Notes
- The default VXLAN destination port in the Linux kernel is historically 8472, while the IANA-standard / RFC 7348 port is 4789. The post correctly uses 4789 explicitly, which is best practice for interoperability.
- For multicast VXLAN (`Group=239.1.1.1`), in production setups it is often useful to also specify `Local=` to bind to a specific underlay interface; the post's minimal multicast example will still work where multicast routing/default interface is unambiguous, but readers with multiple interfaces may need to add `Local=`.
- A more modern alternative to `systemctl restart systemd-networkd` is `networkctl reload` followed by `networkctl reconfigure <iface>`, which avoids dropping all managed links. The restart approach in the post is still valid.
- The post does not cover advanced [VXLAN] options such as `MacLearning=`, `FDBAgeingSec=`, `Independent=`, `PortRange=`, or `UDPChecksum=`, but this is appropriate for an introductory guide.
