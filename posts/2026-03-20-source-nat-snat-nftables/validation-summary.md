# Validation Summary: How to Configure Source NAT (SNAT) with nftables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables
- Linux kernel IPv4 forwarding
- Source NAT (SNAT)
- Masquerade
- Conntrack-based firewall rules
- curl

## Sources Consulted
- nftables wiki: Performing Network Address Translation (NAT) - https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- nftables manual page: NAT statements, table/chain syntax, interface metadata, and `list ruleset` behavior - https://netfilter.org/projects/nftables/manpage.html
- nftables wiki: Netfilter hooks and source NAT priority - https://wiki.nftables.org/wiki-nftables/index.php/Netfilter_hooks
- Linux kernel documentation: `net.ipv4.ip_forward` sysctl - https://docs.kernel.org/6.18/networking/ip-sysctl.html
- curl manual page: `-4, --ipv4` option - https://curl.se/docs/manpage.html
- RFC 5737: IPv4 documentation address blocks - https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The post used `iif`/`oif` with interface names in examples intended to be saved and reloaded. These match interface indexes and can fail when the named interface is not present at load time. Changed the examples to `iifname`/`oifname` so they match by interface name and are more appropriate for persistent configuration.
- The prerequisites named only the WAN interface, but the full configuration also uses `eth1` for LAN forwarding. Updated the prerequisite to include the LAN interface.
- The verification command used `curl ifconfig.me`, which can use IPv6 on a dual-stack host even though the ruleset configures IPv4 SNAT only. Changed it to `curl -4 ifconfig.me`.

## Review Notes
- The nftables NAT syntax, postrouting hook, `priority 100`, SNAT address/range syntax, masquerade comparison, and IPv4 forwarding sysctl are consistent with the consulted documentation.
- `203.0.113.1` and `203.0.113.1-203.0.113.5` are RFC 5737 documentation addresses and should be replaced with assigned public IPv4 addresses in a real deployment.
- For Linux kernels before 4.18, nftables NAT required both `prerouting` and `postrouting` base chains for reverse translation paths; current nftables documentation assumes newer kernels.
