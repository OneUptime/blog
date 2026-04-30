# Validation Summary: How to Create an IPv6 Migration Checklist

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6
- Linux networking tools (`ip`, `ss`, `sysctl`, `ping`, `dig`, `curl`)
- DNS and AAAA records
- SLAAC and IPv6 addressing
- Router Advertisements / RA Guard
- DHCPv6
- IPAM / NetBox

## Sources Consulted
- RFC 6177, "IPv6 Address Assignment to End Sites" - https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- RFC 7421, "Analysis of the 64-bit Boundary in IPv6 Addressing" - https://www.rfc-editor.org/rfc/rfc7421
- RFC 6105, "IPv6 Router Advertisement Guard" - https://www.rfc-editor.org/rfc/rfc6105
- Linux kernel documentation, "IP Sysctl" - https://docs.kernel.org/networking/ip-sysctl.html
- curl tool man page - https://curl.se/docs/manpage.html
- Linux `ss(8)` manual page - https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `ping(8)` manual page - https://www.man7.org/linux/man-pages/man8/ping.8.html
- Local runtime/help checks: `ss --help`, `ip -6 route show 2001:db8::/32`, `dig AAAA no-such-name.invalid +short`, `ping -6 -c 1 ::1`, `ping6 -c 1 ::1`

## Issues Found
- The address-allocation bullet was too prescriptive. RFC 6177 explicitly says a one-size-fits-all recommendation is not appropriate for all end sites, so I changed it to say the actual allocation size should be documented and gave common examples instead of treating them as universal rules.
- The per-service bind checklist incorrectly implied that binding to `::` is the only correct IPv6 configuration. I narrowed that item to require an IPv6 listener, with `::` kept as a common example.
- Several shell checks were false positives because they only tested whether a command executed successfully. `sysctl`, `ip -6 route show`, `dig ... +short`, and `ip -6 neigh show` can all exit successfully even when the desired state is absent. I updated those checks to validate actual values or non-empty output.
- The service-listener check used a broken `ss`/`grep` pattern and the script used `ping6` instead of the current `ping -6` form documented by `ping(8)`. I replaced the listener check with an IPv6-aware `ss` filter and updated the ping command. I also clarified that the hard-coded port list is an example that should be adjusted per environment.

## Review Notes
- The automation snippet is Linux-specific. It assumes `/proc/sys`, `ip`, `ss`, `sysctl`, `dig`, and `ping` are available.
- The DNS check now correctly describes what it verifies: AAAA resolution works. It does not specifically prove that the stub resolver is talking to its upstream resolver over IPv6 transport.
