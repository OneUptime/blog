# Validation Summary: How to Configure IPv6 on Asus Home Routers

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- IPv6 (Native, DHCPv6, SLAAC, Router Advertisement, Prefix Delegation)
- ASUSWRT firmware (Asus router admin interface)
- ASUSWRT-Merlin (third-party firmware)
- DUID-LLT (DHCP Unique Identifier)
- IPv6 firewall rules
- Tunneling protocols (6in4, 6to4)
- Windows networking commands (ipconfig, ping -6)

## Sources Consulted
- Asus official ASUSWRT documentation: https://www.asus.com/support/FAQ/1042478/ (IPv6 setup on Asus routers)
- RFC 3849 (IPv6 documentation address prefix 2001:db8::/32)
- RFC 4862 (IPv6 Stateless Address Autoconfiguration / SLAAC)
- RFC 8415 (DHCPv6) — covers DUID types including DUID-LLT
- RFC 7084 (Basic Requirements for IPv6 Customer Edge Routers)
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using (confirms 2001:4860:4860::8888)
- ASUSWRT-Merlin project documentation: https://www.asuswrt-merlin.net/
- Microsoft Windows ipconfig and ping documentation

## Issues Found
- **Invalid IPv6 address in firewall rule example**: The original post used `2001:db8:home::/64` as an example LAN prefix. The characters 'h', 'o', 'm' are not valid hexadecimal digits (only 0-9 and a-f are valid in IPv6 addresses), so this was a malformed address that would not parse. Replaced with `2001:db8:1::/64`, which is a valid example using the RFC 3849 documentation prefix `2001:db8::/32`.

## Review Notes
- The default Asus router IP `192.168.1.1` is correct for most RT-AC and RT-AX models. Note that newer ZenWiFi mesh systems (listed in the supported routers section) typically default to `192.168.50.1` instead, which the post does not call out. This isn't strictly an error, but a future revision could mention it.
- The default `admin/admin` credentials are accurate for older firmware, but newer ASUSWRT firmware versions force the user to set a custom admin password during initial setup. Mentioning this might be helpful in a future update.
- The IPv6 connection type list is accurate for current ASUSWRT firmware. Some older firmware versions list DHCPv6 as a sub-option under "Native" rather than a separate top-level option, but recent versions do present DHCPv6 separately as shown.
- The placeholder notation `2001:xxx:xxx:xxx::1` for ISP-assigned addresses uses 'x' which isn't a valid hex digit, but it's used here as obvious placeholder notation (not a literal example), so it remains acceptable as written.
- DUID-LLT (DUID based on Link-layer address plus Time) is indeed the default and recommended DUID type per RFC 8415.
- The Stateless DHCPv6 explanation (provides DNS but not addresses, with SLAAC handling addresses) is technically correct.
