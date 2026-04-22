# Validation Summary: How to Set the VNI (VXLAN Network Identifier) on Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux networking
- VXLAN
- VNI / VXLAN Network Identifier
- iproute2 `ip link`
- Overlay networking

## Sources Consulted
- RFC 7348, "Virtual eXtensible Local Area Network (VXLAN)": https://datatracker.ietf.org/doc/html/rfc7348
- Linux kernel VXLAN documentation: https://www.kernel.org/doc/html/latest/networking/vxlan.html
- iproute2 `ip-link(8)` VXLAN type support man page: https://manpages.debian.org/unstable/iproute2/ip-link.8.en.html
- Local `ip link help vxlan` output from iproute2 6.1.0, confirming `id VNI`, `dstport`, `local`, `dev`, and VNI range `0-16777215`
- Linux kernel VXLAN source, confirming VNI changes are rejected after creation: https://codebrowser.dev/linux/linux/drivers/net/vxlan/vxlan_core.c.html

## Issues Found
- The VNI isolation example used `10.100.0.1` for both Host A and Host B, then described pinging `10.100.0.1` from VNI 100. That could resolve as the local Host A address rather than demonstrating failed direct communication to a different VNI. Changed Host B to `10.100.0.2` in the same IP range and clarified that the isolation is Layer 2/direct VXLAN isolation.

## Review Notes
The VXLAN commands use current `ip link` syntax for Linux VXLAN devices. `dstport 4789` matches the IANA-assigned VXLAN UDP port and is appropriate because Linux historically used a different default for compatibility. The examples do not include remote endpoints, multicast groups, or FDB entries, so they demonstrate VNI/interface creation rather than a complete multi-host VXLAN deployment.
