# Validation Summary: How to Identify and Reclaim Unused IPv4 Address Space

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing and subnetting
- Nmap host discovery
- Python (`ipaddress`, `subprocess`, `itertools`)
- ISC DHCP lease database inspection
- Cisco IOS ARP inspection
- Linux ARP/neighbor cache inspection (`ip neigh`, `/proc/net/arp`)
- NetBox REST API

## Sources Consulted
- Nmap host discovery reference: https://nmap.org/book/man-host-discovery.html
- Nmap options summary (`-sn`, `-n`): https://nmap.org/book/man-briefoptions.html
- Nmap grepable output deprecation (`-oG`): https://nmap.org/book/output-formats-grepable-output.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- ISC DHCP `dhcpd.leases` manual page: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP end-of-life notice: https://kb.isc.org/docs/isc-dhcp-eol-dates
- Cisco IOS ARP documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_arp/configuration/15-s/arp-15-s-book/arp-monitor-arp.html
- Cisco `show ip arp` command reference: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/show_ip_arp.htm
- Cisco `ip route` command reference: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_route.htm
- Linux `ip-neighbour(8)` manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- Linux `arp(7)` manual: https://man7.org/linux/man-pages/man7/arp.7.html
- NetBox prefix model documentation: https://netbox.readthedocs.io/en/feature/models/ipam/prefix/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- RFC 3021 (`/31` on IPv4 point-to-point links): https://datatracker.ietf.org/doc/html/rfc3021

## Issues Found
- The Nmap examples used grepable output (`-oG`), which Nmap documents as deprecated. I replaced them with `-sn -n` scans and parsing of standard output.
- The subnet sampling code treated a 20-host sample as if it were full-subnet utilization and labeled no replies as `UNUSED`. I changed it so the math reflects only the sampled hosts and the status now accurately reports `NO_RESPONSE_IN_SAMPLE`.
- The DHCP lease example counted every `lease` stanza, including historical and non-active entries. ISC documents the lease file as log-structured, with the last declaration being current and `binding state` indicating whether a lease is active. I replaced the snippet with a parser that counts only current active leases.
- The Cisco IOS ARP example used shell-style `grep`/`awk` redirection that is not valid as shown for IOS. I replaced it with the valid IOS `show ip arp` command and updated the Linux example to use current `ip -4 neigh` output instead of the older `arp -n` approach.
- The ARP cache section claimed `/proc/net/arp` could show when entries were last seen. That file shows the current ARP cache, not last-seen timestamps, so I corrected the wording and kept the `0x2` complete-entry check aligned with `ATF_COM`.
- The subnet right-sizing code had a logic bug: `optimal_prefix < net.prefixlen` prevented the over-allocation warning from appearing for the provided `/22` example. I corrected the prefix-selection logic and verified the example now recommends `/27`.
- The NetBox example used a default prefix status of `available`, which is not one of NetBox’s documented default prefix statuses. I changed it to `reserved`, updated the example to use a `PATCH` request with a `Bearer` token for current NetBox API usage, and used `changelog_message` instead of overwriting the description field.
- The conclusion claimed quarterly audits can recover `20-40%` of unused space in a typical enterprise network. I could not validate that statistic from authoritative product or standards documentation, so I softened it to a non-quantified statement.

## Review Notes
- ISC DHCP remains technically usable for the example shown, but ISC has declared it end-of-life and recommends migration planning.
- The `ping` options shown in the Python sample are Linux-specific (`iputils` syntax); the post now states that explicitly.
- Ping/ARP/DHCP correlation is still the right overall approach here: no single signal should be treated as proof that a subnet is safe to reclaim.
