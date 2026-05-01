# Validation Summary: How to Disable ICMP Redirect Acceptance for Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- ICMP redirects
- IPv4 sysctl
- `iptables`

## Sources Consulted
- Linux Kernel documentation: IP Sysctl - https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 1122: Requirements for Internet Hosts - Communication Layers - https://www.rfc-editor.org/rfc/rfc1122
- RFC 1812: Requirements for IP Version 4 Routers - https://www.rfc-editor.org/rfc/rfc1812
- `icmp(7)` Linux man page - https://man7.org/linux/man-pages/man7/icmp.7.html
- `iptables-extensions(8)` Linux man page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local `iptables -p icmp --help` output on `iptables v1.8.10 (nf_tables)` to confirm the current `redirect` ICMP typename

## Issues Found
- The redirect examples used a network prefix (`10.0.0.0/24`) as if routers normally emit network redirects. RFC 1812 requires routers to send host redirects rather than network redirects, so I changed the examples to a host-specific destination (`10.0.0.42`).
- The attack description implied a generic attacker could send a useful redirect. RFC 1122 and Linux `icmp(7)` require valid redirects to come from the current first-hop gateway, so I tightened the wording to an on-link attacker spoofing the current gateway.
- The post hardcoded `eth0` for interface-specific checks. That is not portable on many modern Linux systems, so I replaced those examples with commands that enumerate current interface settings generically.
- The `iptables` section appended a plain `DROP` rule before the logging rule, which would prevent the later `LOG` rule from ever matching. I changed it to a single log-then-drop sequence.
- The verification command matched every IPv4 sysctl containing the word `redirect`, which also includes unrelated `net.ipv4.route.redirect_*` settings. I narrowed the check to `accept_redirects`, `secure_redirects`, and `send_redirects`, and expanded the compliance grep to match the same settings.
- The closing sentence claimed this change has "no functional impact" on normal server operations. Because ICMP redirects are still legitimate in some network designs, I softened that to "little to no functional impact on most server operations."

## Review Notes
- The guide is specifically about IPv4 ICMP redirect handling. Linux also has separate IPv6 redirect acceptance controls via `net.ipv6.conf.*.accept_redirects` in the kernel documentation.
- The `iptables` example is valid on current `iptables`/`nf_tables` systems, but firewall rule persistence across reboot is distribution-specific and outside the scope of this post.
- State-changing `sysctl` and `iptables` commands were reviewed against documentation and local command help, but were not executed in this workspace to avoid modifying the host network configuration.
