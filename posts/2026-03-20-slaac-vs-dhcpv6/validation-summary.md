# Validation Summary: SLAAC vs DHCPv6: Choosing the Right IPv6 Address Assignment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 Router Advertisements
- SLAAC
- DHCPv6
- RA M, O, and Prefix Information A flags
- RDNSS DNS configuration
- radvd configuration
- Cisco IOS IPv6 Neighbor Discovery configuration

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://datatracker.ietf.org/doc/html/rfc8415
- RFC 8106: IPv6 Router Advertisement Options for DNS Configuration - https://datatracker.ietf.org/doc/html/rfc8106
- RFC 7217: Stable and Opaque Interface Identifiers with SLAAC - https://datatracker.ietf.org/doc/rfc7217/
- RFC 8981: Temporary Address Extensions for SLAAC - https://datatracker.ietf.org/doc/html/rfc8981
- RFC 5908: Network Time Protocol Server Option for DHCPv6 - https://www.rfc-editor.org/rfc/rfc5908.html
- RFC 5970: DHCPv6 Options for Network Boot - https://www.rfc-editor.org/rfc/rfc5970
- radvd.conf man page - https://sources.debian.org/src/radvd/1%3A2.15-2/radvd.conf.5.man/
- Cisco IOS IPv6 Command Reference - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Microsoft Add-DhcpServerv6Reservation documentation - https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv6reservation?view=windowsserver2025-ps

## Issues Found
- The post implied that the M flag controls whether hosts use SLAAC. Updated the explanation to state that M/O signal DHCPv6 availability, while the Prefix Information A flag controls SLAAC for an advertised prefix.
- The stateful DHCPv6-only examples said no SLAAC address is generated based on M=1. Clarified that this is only true when advertised prefixes have A=0, and added the Cisco `ipv6 nd prefix ... no-autoconfig` example.
- The note said A=1 triggers SLAAC only on some implementations. Corrected it to reflect RFC behavior: A=1 enables SLAAC for that prefix regardless of the M flag.
- The comparison table used a `yaml` code fence for non-YAML content. Changed it to `text`.
- Several table entries were too absolute: SLAAC address tracking, NTP/other options, DHCPv6 address stability, prefix delegation, and privacy defaults. Tightened them to match RFC-defined behavior and common deployment reality.
- Replaced the broad claim that all Linux/macOS/Windows hosts support RDNSS with the standards-based statement that RDNSS is standardized and works on clients that support it.
- Updated DHCPv6 wording from `INFO-REQUEST` to the RFC term `Information-request`, and described the normal stateful DHCPv6 Solicit/Advertise/Request/Reply exchange.
- Replaced "TFTP server for PXE boot" with "Bootfile/PXE options" to align with DHCPv6 network boot options.

## Review Notes
DHCPv6 can provide address tracking only for DHCPv6-assigned leases; environments that also advertise A=1 prefixes may still create untracked SLAAC and temporary addresses. Router Advertisements remain required for default gateway discovery even when addresses are assigned by DHCPv6.
