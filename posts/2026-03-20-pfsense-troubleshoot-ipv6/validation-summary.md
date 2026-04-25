# Validation Summary: How to Troubleshoot IPv6 on pfSense

## Status
validated

## Post Type
Guide

## Technologies Covered
- pfSense
- IPv6
- DHCPv6
- SLAAC
- Router Advertisements
- ICMPv6
- pfSense diagnostics and CLI tools

## Sources Consulted
- Netgate pfSense Documentation, Advanced Networking: https://docs.netgate.com/pfsense/en/latest/config/advanced-networking.html
- Netgate pfSense Documentation, IPv6 Configuration Types: https://docs.netgate.com/pfsense/en/latest/interfaces/configure-ipv6.html
- Netgate pfSense Documentation, DHCPv6 Server: https://docs.netgate.com/pfsense/en/latest/services/dhcp/ipv6.html
- Netgate pfSense Documentation, IPv6 Router Advertisements: https://docs.netgate.com/pfsense/en/latest/services/dhcp/ipv6-ra.html
- Netgate pfSense Documentation, Address Format: https://docs.netgate.com/pfsense/en/latest/network/ipv6/addresses.html
- Netgate pfSense Documentation, IPv6 WAN Types: https://docs.netgate.com/pfsense/en/latest/network/ipv6/wan-types.html
- Netgate pfSense Documentation, DNS Lookup: https://docs.netgate.com/pfsense/en/latest/diagnostics/dns.html
- Netgate pfSense Documentation, Ping Host: https://docs.netgate.com/pfsense/en/latest/diagnostics/ping.html
- Netgate pfSense Documentation, Traceroute: https://docs.netgate.com/pfsense/en/latest/diagnostics/traceroute.html
- Netgate pfSense Documentation, Command Prompt: https://docs.netgate.com/pfsense/en/latest/diagnostics/command-prompt.html
- Netgate pfSense Documentation, Introduction to the Firewall Rules screen: https://docs.netgate.com/pfsense/en/latest/firewall/rule-list-intro.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/rfc4890/

## Issues Found
- The post treated the `Enable IPv6 over IPv4 Tunneling` option as a general IPv6/tunnel setting. Current Netgate docs document it as forwarding protocol 41 to a downstream host, so the wording was narrowed to avoid enabling it unnecessarily.
- The WAN SLAAC section implied it is a normal routed-WAN choice. Netgate docs note SLAAC on WAN is generally not useful for a router because it does not provide a routed inside prefix, so the description was corrected.
- The DHCPv6 WAN snippet used `DHCPv6` as the interface type label. Current pfSense documentation uses `DHCP6`, so the snippet was updated.
- The DHCPv6 prefix delegation example implied only `/48` or `/56` sizes are expected. Netgate documents delegation sizes more broadly, typically somewhere between `/48` and `/64`, so the example was generalized to match ISP-assigned values.
- The static and LAN DHCPv6 example addresses used invalid placeholders such as `2001:db8:wan::2` and `2001:db8:lan::100`. These were replaced with syntactically valid documentation-prefix IPv6 addresses.
- The DHCPv6 server section used an outdated combined menu path and omitted the Router Advertisement requirement. Netgate docs require RA to be enabled in Managed or Assisted mode for DHCPv6 clients, so the menu path and configuration were corrected.
- The firewall rules section implied adding a LAN-to-any IPv6 rule is always required. pfSense fresh installs already include default LAN allow rules for IPv4 and IPv6, so the text was adjusted to verify or add the rule as needed.
- The CLI example used a hardware-specific interface name (`em0`). This was replaced with a generic `ifconfig | grep inet6` example so it works across pfSense deployments with different NIC names.
- The conclusion said to always allow ICMPv6 broadly. That was narrowed to avoiding blanket blocking, which better matches IPv6 Neighbor Discovery requirements and ICMPv6 filtering guidance.

## Review Notes
- The post is technically relevant and salvageable; after correction, it is suitable to keep.
- The prerequisite `pfSense 2.5+` is broad, but the corrected guidance still aligns with current Netgate documentation as of April 25, 2026.
- The OneUptime link is valid and plausible for the monitoring example, though the monitoring guidance is product-level advice rather than pfSense-specific documentation.
