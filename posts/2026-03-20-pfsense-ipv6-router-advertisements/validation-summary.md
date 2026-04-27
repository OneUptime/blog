# Validation Summary: How to Configure IPv6 Router Advertisements on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (firewall/router OS)
- IPv6
- SLAAC (Stateless Address Autoconfiguration, RFC 4862)
- DHCPv6 (RFC 8415)
- DHCPv6 Prefix Delegation (RFC 8415)
- Router Advertisement Daemon (radvd) / kernel RA on FreeBSD
- ICMPv6 (RFC 4443, RFC 4890)
- FreeBSD CLI tools (`ifconfig`, `netstat`)

## Sources Consulted
- pfSense official documentation: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6-wan.html
- pfSense IPv6 LAN configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6-lan.html
- pfSense DHCPv6 Server & Router Advertisements: https://docs.netgate.com/pfsense/en/latest/services/dhcpv6/index.html
- pfSense IPv6 firewall rules / ICMPv6 guidance: https://docs.netgate.com/pfsense/en/latest/firewall/configure.html
- RFC 4862 (IPv6 Stateless Address Autoconfiguration)
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 4890 (Recommendations for Filtering ICMPv6 Messages in Firewalls)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation, 2001:db8::/32)
- RFC 8415 (DHCPv6, including Prefix Delegation)
- FreeBSD man pages: ifconfig(8), netstat(1)

## Issues Found
- Typo "autoconfiuration" appeared twice (in the Description field and in the Overview section). Corrected to "autoconfiguration" in both locations.

## Review Notes
- The path "Services → DHCPv6 Server & RA" matches the historical pfSense WebGUI menu naming. In recent pfSense Plus / CE releases the menu has been reorganized slightly (e.g., "Services → DHCPv6/RA" with tabbed sub-pages including "Router Advertisements"), but the breadcrumb used in the post is still recognizable and accurate for pfSense 2.5–2.7.
- The post is titled "Router Advertisements" but does not deeply cover the dedicated RA tab (Router mode: Router Only / Unmanaged / Managed / Assisted / Stateless DHCP, RA priority, RA interval, DNS configuration in RA). This is a content depth observation, not a technical error — the existing material is accurate.
- The IPv6 documentation addresses use the labels "wan" and "lan" inside the prefix (e.g., `2001:db8:wan::2/64`). Strictly speaking these are not valid hexadecimal characters, so the literal strings are not valid IPv6 addresses. They are clearly used as visual placeholders (similar to "FOO/BAR") and the surrounding context makes the intent obvious, so this was left unchanged. A reader copy-pasting them literally would need to substitute real hex values; this is consistent with how the rest of the post presents illustrative example values.
- `2001:4860:4860::8888` is correctly identified as Google Public DNS over IPv6.
- ICMPv6 firewall guidance (do NOT block all ICMPv6) aligns with RFC 4890 recommendations.
- `ifconfig em0 | grep inet6` and `netstat -rn -f inet6` are valid FreeBSD invocations available from the pfSense Diagnostics → Command Prompt; `em0` is an example NIC name and may differ on real hardware.
- pfSense 2.5+ as the minimum is conservative and reasonable; pfSense has had IPv6 support since 2.1, but 2.5 ensures the modern Track Interface / DHCPv6-PD workflow described here.
