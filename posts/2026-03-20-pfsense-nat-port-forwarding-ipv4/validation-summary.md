# Validation Summary: How to Set Up NAT Port Forwarding on pfSense for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- pfSense (firewall/router platform)
- PF (Packet Filter, FreeBSD)
- NAT / Destination NAT (DNAT) / Port Forwarding
- NAT Reflection (Hairpin NAT) — Pure NAT and Hybrid Outbound NAT modes
- pfctl (PF control utility)
- curl, nc (netcat) for verification

## Sources Consulted
- pfSense Documentation — Port Forwards: https://docs.netgate.com/pfsense/en/latest/nat/port-forwards.html
- pfSense Documentation — NAT Reflection: https://docs.netgate.com/pfsense/en/latest/nat/reflection.html
- pfSense Documentation — Outbound NAT: https://docs.netgate.com/pfsense/en/latest/nat/outbound.html
- FreeBSD PF Handbook — Translation (rdr) syntax: https://docs.freebsd.org/en/books/handbook/firewalls/#firewalls-pf
- OpenBSD PF FAQ — Network Address Translation: https://www.openbsd.org/faq/pf/nat.html
- pfctl(8) man page

## Issues Found
No technical issues found.

- The GUI navigation path (Firewall > NAT > Port Forward) and field names (Interface, Protocol, Destination, Destination port range, Redirect target IP/port, Filter rule association) match the pfSense web UI.
- The PF syntax for `rdr pass on em0 proto tcp from any to (em0) port 80 -> 192.168.1.100 port 80` and the associated `pass in ... flags S/SA keep state` rule are valid PF syntax and representative of what pfSense generates in `/tmp/rules.debug`.
- The NAT Reflection options ("Pure NAT", "Hybrid Outbound NAT") and the System > Advanced > Firewall & NAT global toggle are accurate.
- The pfctl diagnostic commands (`pfctl -s nat`, `pfctl -s state`) are correct and supported.
- Common port assignments in the examples table (HTTP/80, HTTPS/443, SSH/22, RDP/3389, Minecraft/25565) are correct.

## Review Notes
- The `(em0)` parenthesized interface notation in the PF rule means "the dynamic IP(s) of em0" — a useful behavior for WAN interfaces with dynamic addresses, but not explicitly explained. This is a minor stylistic note, not an error.
- Modern pfSense (2.5+) typically generates the `rdr` rule and the associated `pass` rule separately rather than relying on the legacy `rdr pass` shorthand. The `rdr pass` form is still valid PF syntax and accurately represents what the engine does conceptually, so the example remains correct.
- Interface naming (em0) is hardware-dependent; on different NICs users will see igb0, ix0, vmx0, etc. The example is fine as illustrative.
