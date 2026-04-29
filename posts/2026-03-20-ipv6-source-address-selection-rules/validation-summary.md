# Validation Summary: How to Apply IPv6 Source Address Selection Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- RFC 6724 source address selection
- Linux `iproute2` (`ip addr`, `ip route`, `ip addrlabel`)
- Linux IPv6 sysctls
- Python `socket`
- `curl`

## Sources Consulted
- RFC 6724: Default Address Selection for Internet Protocol Version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc6724
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-address(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-route.8.html
- Python `socket` documentation - https://docs.python.org/3/library/socket.html
- `curl` man page - https://curl.se/docs/manpage.html
- Linux `connect(2)` and `getpeername(2)` manual pages - https://man7.org/linux/man-pages/man2/connect.2.html and https://man7.org/linux/man-pages/man2/getpeername.2.html
- Live URL check for `https://ifconfig.co` and `https://ifconfig.co/ip` on 2026-04-29

## Issues Found
- The post omitted RFC 6724 Rule 5.5 and oversimplified several rule descriptions. I added Rule 5.5 and tightened the wording for Rules 2, 6, 7, and 8 so they match the RFC more closely.
- The Linux lab setup claimed that `use_tempaddr=2` alone would create temporary addresses from a manually added address. I changed the example to add the global `/64` with `mngtmpaddr`, which `ip-address(8)` documents as required for kernel-managed temporary addresses on manually configured networks.
- The setup also suggested adding `fe80::10` manually while calling it "already present". I replaced that with a command that shows the interface's existing link-local address instead, because link-local addresses are automatically present on IPv6 interfaces.
- The Rule 2 verification used `ping6` plus `ss`, which does not reliably show ICMPv6 source-address selection. I replaced those commands with `ip -6 route get ...`, which `ip-route(8)` documents as resolving the route exactly as the kernel sees it without actually sending packets.
- The Rule 6 example hardcoded Linux default label numbers and re-added a broad ULA label entry that may already exist or differ by system. I replaced it with explicit custom labels on the specific ULA and destination prefixes used in the example.
- The `curl` verification URL `https://ifconfig.co/ip` was stale and returned HTTP 404 on 2026-04-29. I changed the example to `https://ifconfig.co`, which returned the public IP as expected.
- The Rule 8 example claimed 64-bit and 48-bit matches for address pairs that did not actually have those common-prefix lengths. I corrected the sample addresses so the narrative and Python output now agree.
- The application-override Python snippet used a TCP connect to a documentation prefix. I switched it to a UDP socket so it still demonstrates explicit source binding while relying only on local source selection and routing.

## Review Notes
- Default IPv6 address-label tables vary across Linux environments. Inspect `ip addrlabel list` before assuming specific numeric labels.
- The `ifconfig.co` examples assume direct outbound IPv6. If traffic leaves through a proxy, tunnel, or NAT66 device, the remotely observed address may differ from the local interface address.
- Rule 5.5 is part of RFC 6724, but the RFC explicitly notes that it only applies on implementations that track which next-hop advertised which prefix, so it is uncommon to demonstrate in a simple host lab.
