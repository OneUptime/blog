# Validation Summary: How to Configure IPv6 on Ubiquiti UniFi Wi-Fi

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Ubiquiti UniFi Network
- UniFi gateways (USG / UDM)
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC
- Router Advertisements
- UniFi firewall policies
- VyOS / EdgeOS-style gateway CLI

## Sources Consulted
- Ubiquiti Help Center, "Configuring IPv6 in UniFi": https://help.ui.com/hc/en-us/articles/36378535649687-Configuring-IPv6-in-UniFi
- Ubiquiti Help Center, "UniFi Gateway - Static IPv6 and DHCPv6 Prefix Delegation": https://help.ui.com/hc/en-us/articles/115005868927-UniFi-Gateway-Static-IPv6-and-DHCPv6-Prefix-Delegation
- Ubiquiti Help Center, "Zone-Based Firewalls in UniFi": https://help.ui.com/hc/en-us/articles/115003173168-Zone-Based-Firewalls-in-UniFi
- Ubiquiti Help Center, "Connecting to UniFi with Debug Tools & SSH": https://help.ui.com/hc/en-us/articles/204909374-Connecting-to-UniFi-with-Debug-Tools-SSH
- Ubiquiti Help Center, "Advanced Logging Information": https://help.ui.com/hc/en-us/articles/204959834-UniFi-How-to-View-Log-Files
- VyOS documentation, Ethernet interface DHCPv6-PD configuration: https://docs.vyos.io/en/latest/configuration/interfaces/ethernet.html
- VyOS 1.3 documentation, firewall rule-set and op-mode syntax: https://docs.vyos.io/en/1.3/configuration/firewall/index.html
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)": https://datatracker.ietf.org/doc/html/rfc8415

## Issues Found
- The post described IPv6 as a single network-level setting and listed incorrect LAN options. Current UniFi requires IPv6 to be configured on both the WAN and the LAN/virtual network. I corrected the paths, the supported WAN methods (`SLAAC`, `DHCPv6`, `Static`), the LAN interface types (`Prefix Delegation`, `Static`), and the recommendation that WAN PD size match the ISP allocation rather than `/64`.
- The `config.gateway.json` example was not valid JSON because it contained comments, and it mixed legacy/incorrect DHCPv6-PD and RA fields in a way that could not be justified against current official UniFi documentation. I replaced it with a version-safe legacy USG note instead of leaving an unsafe, misleading override example.
- The UDM troubleshooting commands referenced undocumented or version-specific internals (`odhcp6c`, `radvd`, and a hard-coded `dnsmasq.leases` path). I replaced those with source-backed SSH access, `ip` inspection, `tcpdump`, and the officially documented UniFi UI path for lease visibility.
- The firewall section used outdated interface-based UniFi UI terminology and an incomplete DHCPv6 rule. I updated it to current UniFi Network 9.x zone-based firewall terminology, documented the built-in External zone behavior, and corrected the DHCPv6 policy to allow UDP source port `547` to destination port `546` toward the Gateway zone.
- The USG CLI verification command `show ipv6 firewall name WAN6_LOCAL statistics` was incorrect for the documented VyOS/EdgeOS-style op-mode syntax. I corrected it to `show firewall ipv6name WAN6_LOCAL statistics`.
- The client verification section used older or less precise examples (`ping6`, `ipv6.google.com`, and a "speed test" comment on a trace endpoint). I updated the examples to use standard `ping -6`, a normal HTTPS connectivity check, and Cloudflare trace output for confirming public IPv6 egress.
- The troubleshooting section used an unsupported `show dhcpv6-pd leases` command and hard-coded AP interface assumptions like `ath0`. I replaced those with a DHCPv6 client log check, generic AP SSH access, and the officially documented `/var/log/messages` path.
- The conclusion incorrectly referred to an "RA broadcast". Router Advertisements are ICMPv6 Router Advertisement messages, typically sent via multicast per RFC 4861. I corrected that wording.

## Review Notes
- Current UniFi Network releases use Zone-Based Firewalls beginning with Network 9.x. Older USG-era interface-based firewall rule sets still exist in legacy workflows, so mixing those two models without qualification is misleading.
- Legacy USG `config.gateway.json` overrides are highly version-sensitive and are no longer documented as the primary configuration path by Ubiquiti. The UniFi UI should be preferred whenever it exposes the required IPv6 settings.
