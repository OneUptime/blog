# Validation Summary: How to Configure IPv6 Prefix Delegation on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (CE 2.5+ / pfSense Plus)
- IPv6
- DHCPv6 / DHCPv6-PD (Prefix Delegation)
- SLAAC (Stateless Address Autoconfiguration)
- ICMPv6
- Router Advertisements (RA)
- FreeBSD CLI utilities (ifconfig, netstat)

## Sources Consulted
- pfSense Documentation — IPv6 WAN configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/wan/ipv6-wans.html
- pfSense Documentation — Track Interface: https://docs.netgate.com/pfsense/en/latest/interfaces/track-interface.html
- pfSense Documentation — DHCPv6 Server & RA: https://docs.netgate.com/pfsense/en/latest/services/dhcp/ipv6.html
- pfSense Documentation — IPv6 firewall rules and ICMPv6: https://docs.netgate.com/pfsense/en/latest/firewall/index.html
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6) including Prefix Delegation
- FreeBSD man pages: ifconfig(8), netstat(1)

## Issues Found
No technical issues found.

The pfSense menu paths (System → Advanced → Networking, Interfaces → WAN, Interfaces → LAN, Services → DHCPv6 Server & RA, Firewall → Rules, Diagnostics → Ping/DNS Lookup/Traceroute/Command Prompt) are all correct. The IPv6 Configuration Type values (SLAAC, DHCPv6, Static IPv6, Track Interface), the "Request only an IPv6 prefix" option, the DHCPv6 Prefix Delegation Size options, and the IPv6 Prefix ID concept are all accurately described. The use of 2001:db8::/32 in examples is correct per RFC 3849. The ICMPv6 firewall guidance aligns with RFC 4890. The FreeBSD commands `ifconfig` and `netstat -rn -f inet6` are valid for the pfSense (FreeBSD-based) shell.

## Review Notes
- The post uses `nginx` as a code-fence language hint for some pfSense WebGUI configuration blocks; this is purely a syntax-highlighting choice (the content is plain text), not a technical error.
- When LAN is configured as "Track Interface", the DHCPv6 server Range From/To values typically need to fit within the dynamically delegated prefix; the documentation prefix examples (2001:db8:lan::100–200) are illustrative only — readers should substitute the actual delegated prefix or use host suffixes.
- The example interface name `em0` is illustrative; actual pfSense interface names depend on the NIC driver (e.g., `igb0`, `ix0`, `re0`, `vmx0`).
- pfSense CE 2.5 was released in 2021; pfSense CE 2.7.x and pfSense Plus 23.x/24.x are the current shipping versions as of the publication date — all UI paths in the post remain valid in current versions.
- Common DHCPv6-PD sizes from ISPs include /48, /52, /56, /60, and /64; /48 and /56 (mentioned in the post) are by far the most common consumer offerings.
