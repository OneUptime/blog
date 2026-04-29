# Validation Summary: How to Configure IPv6 on Ubiquiti UniFi

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ubiquiti UniFi / UniFi Network
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC and Router Advertisements
- IPv6 DNS and RDNSS
- Linux, macOS, and Windows network troubleshooting commands

## Sources Consulted
- Ubiquiti Help Center: Configuring IPv6 in UniFi - https://help.ui.com/hc/en-us/articles/36378535649687-Configuring-IPv6-in-UniFi
- Ubiquiti Help Center: UniFi Gateway - Static IPv6 and DHCPv6 Prefix Delegation - https://help.ui.com/hc/en-us/articles/115005868927-UniFi-Gateway-Static-IPv6-and-DHCPv6-Prefix-Delegation
- Ubiquiti Help Center: Connecting to UniFi with Debug Tools & SSH - https://help.ui.com/hc/en-us/articles/204909374-Connecting-to-UniFi-with-Debug-Tools-SSH
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8106: IPv6 Router Advertisement Options for DNS Configuration - https://datatracker.ietf.org/doc/html/rfc8106
- Microsoft Learn: ipconfig - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Local `--help` output checked for `ip`, `ping`, and `tcpdump`

## Issues Found
- The WAN section incorrectly treated `PPPoE` as an IPv6 connection type and omitted `SLAAC`. I corrected it to the WAN IPv6 modes documented by Ubiquiti and clarified that PPPoE is a WAN transport that can carry IPv6.
- The LAN `IPv6 Interface Type` list included outdated options and older RA-mode wording. I changed it to the currently documented `Static` and `Prefix Delegation` interface types, with client address assignment handled separately as SLAAC or DHCPv6.
- The `Prefix ID` example said `1` was the first delegated `/64`. I changed that to describe `1` as an example unique prefix ID, which avoids an incorrect subnet-order claim.
- The DHCPv6-PD troubleshooting section relied on unsupported specifics such as `Rapid Commit` and a required DUID type. I replaced those with documented checks around provider-specific DHCPv6 settings and delegated prefix size.
- The gateway CLI section mixed EdgeOS-style `show ...` commands with UDM/UDM-Pro devices. I replaced those examples with portable Linux commands that are safer across current UniFi gateway families.
- The client-side examples hard-coded interface names too aggressively. I simplified the Windows command, made the macOS check less interface-specific, and noted that `eth0` should be replaced with the actual client interface name.

## Review Notes
- UniFi UI labels vary across Network application versions, especially between older "Controller" terminology and current help-center wording. The corrected instructions now align with current official documentation while remaining readable for older versions.
- SSH behavior and available CLI commands differ between USG/EdgeOS devices and UniFi OS consoles, so generic Linux networking commands are a better fit for a version-agnostic blog post.
