# Validation Summary: How to Configure Firewall Rules for IPv4 on pfSense

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- pfSense
- FreeBSD pf (packet filter)
- pfctl CLI
- IPv4 firewall rules
- VLAN segmentation
- RFC1918 private address space

## Sources Consulted
- pfSense documentation: Firewall Rule Basics (https://docs.netgate.com/pfsense/en/latest/firewall/rule-methodology.html)
- pfSense documentation: Configuring firewall rules (https://docs.netgate.com/pfsense/en/latest/firewall/configure.html)
- pfSense documentation: Aliases (https://docs.netgate.com/pfsense/en/latest/firewall/aliases.html)
- FreeBSD pfctl(8) manual page (https://man.freebsd.org/cgi/man.cgi?pfctl(8))
- RFC 1918 — Address Allocation for Private Internets (https://datatracker.ietf.org/doc/html/rfc1918)

## Issues Found
No technical issues found.

- The claim that pfSense uses the FreeBSD pf engine, with top-to-bottom rule evaluation and first-match semantics, is correct.
- The default rule behavior described (WAN blocks inbound, LAN allows outbound, OPT interfaces have no default allow rules) matches pfSense behavior.
- The GUI field names under Firewall > Rules (Action, Interface, Address Family, Protocol, Source, Destination, Destination port, Description) match the pfSense web UI.
- RFC1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are correct per RFC 1918.
- All `pfctl` commands shown are valid and produce the described output:
  - `pfctl -sr` shows the active filter rules
  - `pfctl -sn` shows NAT rules
  - `pfctl -s state` shows the state table
  - `pfctl -vs rules` shows verbose rule statistics
  - `pfctl -F states` flushes the state table
- Aliases (Firewall > Aliases) and host-list type are accurate.

## Review Notes
- pfSense also offers built-in checkboxes on the WAN interface configuration page for "Block private networks and loopback addresses" and "Block bogon networks", which automate the anti-spoofing rules described in the manual approach. The manual approach shown in the post is still valid and useful, especially when more granular control is needed.
- The post does not specify a pfSense version. The GUI paths and `pfctl` commands shown are consistent with pfSense CE 2.7.x and pfSense Plus 23.x/24.x as of the validation date.
- The "Allow established" comment in the LAN rules section is informational — pfSense rules are stateful by default, so return traffic for established connections is automatically permitted without an explicit rule.
