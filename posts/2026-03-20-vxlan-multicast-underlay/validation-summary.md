# Validation Summary: How to Configure VXLAN with Multicast Underlay

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VXLAN (Virtual eXtensible LAN, RFC 7348)
- Linux iproute2 (`ip link`, `ip addr`, `ip maddr`, `bridge fdb`)
- IP Multicast (IGMP/PIM underlay, 239.0.0.0/8 administratively scoped range)
- iptables (netfilter firewall rules)
- VTEPs and BUM traffic flooding

## Sources Consulted
- RFC 7348 - Virtual eXtensible Local Area Network (VXLAN) — https://datatracker.ietf.org/doc/html/rfc7348
- RFC 1112 - Host Extensions for IP Multicasting (multicast MAC mapping, §6.4) — https://datatracker.ietf.org/doc/html/rfc1112
- RFC 2365 - Administratively Scoped IP Multicast (239.0.0.0/8) — https://datatracker.ietf.org/doc/html/rfc2365
- iproute2 `ip-link(8)` man page, VXLAN section — https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` man page (fdb subcommand) — https://man7.org/linux/man-pages/man8/bridge.8.html
- IANA Service Name and Transport Protocol Port Number Registry (VXLAN UDP 4789)
- Linux kernel Documentation/networking/vxlan.rst

## Issues Found
- **Broken bash line continuations with inline comments.** In the first `ip link add` code block, the backslashes at the end of each line were followed by spaces and inline comments (`\               # VNI`). In bash, `\` only continues the line when it is immediately followed by a newline; when followed by a space, it escapes the space, and the `#` then begins a terminating comment. That means the command would have executed as `ip link add vxlan0 type vxlan id 100` and subsequent tokens (`dstport 4789`, `group 239.1.1.1`, `dev eth0`) would have run as separate invalid commands. Replaced the inline comments with a multi-line comment block above the command and kept the continuations clean so the example is copy-pasteable and executes correctly.

## Review Notes
- The multicast MAC example `01:00:5e:01:01:01` correctly derives from 239.1.1.1 per RFC 1112 §6.4 (lower 23 bits of the IP mapped into the OUI 01:00:5e).
- The default multicast FDB entry format (`00:00:00:00:00:00 dev vxlan0 dst 239.1.1.1 via eth0`) matches iproute2/bridge output.
- 239.1.1.1 is within the administratively scoped 239.0.0.0/8 range (RFC 2365), which is appropriate for private overlay deployments.
- The post correctly notes that multicast routing must be enabled in the underlay; in practice this requires PIM (Sparse or Dense mode) or IGMP snooping with a querier on L2-only underlays. A future revision could briefly mention these operational prerequisites.
- `iptables -A INPUT -d 239.0.0.0/8 -j ACCEPT` is broad but acceptable for the learning context; operators hardening production may prefer to scope this to the specific group used.
- Kernel version caveat: VXLAN multicast mode has been supported since Linux 3.7 and is stable on all modern distributions, so no version pinning is required.
