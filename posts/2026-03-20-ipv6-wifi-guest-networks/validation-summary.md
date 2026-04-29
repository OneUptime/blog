# Validation Summary: How to Configure IPv6 for Wi-Fi Guest Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 subnetting and guest network design
- Router Advertisements with `radvd`
- DHCPv6 with Kea DHCP
- `ip6tables` guest isolation rules
- `nftables` guest isolation rules
- VLAN- and SSID-based network isolation
- RDNSS-based DNS advertisement in IPv6 RA

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106
- `radvd.conf(5)` Debian man page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- Kea DHCPv6 Server Administrator Reference Manual: https://kea.readthedocs.io/en/kea-2.7.6/arm/dhcp6-srv.html
- ISC DHCP 4.4 `dhcpd.conf` manual page, including EOL notice: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP standard options reference: https://kb.isc.org/docs/standard-dhcp-options
- nftables man page: https://netfilter.org/projects/nftables/manpage.html
- nftables bridge filtering documentation: https://wiki.nftables.org/wiki-nftables/index.php/Bridge_filtering
- Local man pages consulted for command syntax: `ip6tables(8)`, `iptables-extensions(8)`, `ping(8)`

## Issues Found
- Several sample IPv6 addresses were invalid because they used non-hex labels such as `corp`, `guest`, and `dns` inside addresses. I replaced them with valid RFC 3849 documentation addresses such as `2001:db8:10::/64`, `2001:db8:20::/64`, and `2001:db8:10::53`.
- The architecture section described `2001:db8::/32` as if it were an ISP-assigned prefix. RFC 3849 reserves that block for documentation only, so I changed the wording to make it explicit that it is an example prefix.
- The intro mixed IPv6 filtering with RFC 1918 terminology, which is IPv4-specific. I removed that claim so the isolation description stays scoped to IPv6.
- The `radvd` example later relied on DHCPv6 but did not set RA managed/other-config flags. I added `AdvManagedFlag on;` and `AdvOtherConfigFlag on;` so the RA and DHCPv6 sections are consistent with RFC 4861 and `radvd.conf(5)`.
- The guest prefix lifetime comment described RA prefix lifetimes as a "lease." That is inaccurate in SLAAC terms, and RFC 4862 places special handling around short valid lifetimes. I corrected the values and comment to describe preferred lifetime behavior accurately.
- The `ip6tables` and `nftables` examples accepted all ICMPv6 before the guest-to-internal deny rules, which would have allowed ICMPv6 access to blocked internal destinations. I rewrote the rule order so internal prefixes are dropped before the general guest-to-Internet allow.
- The post claimed that router `FORWARD` rules provide same-SSID guest client isolation. On-link traffic between clients on the same VLAN does not traverse the router's L3 forward path; it must be handled on the AP or with bridge-family filtering. I corrected both firewall sections and the verification text to reflect that.
- The DHCPv6 section used ISC DHCP, which ISC now marks as EOL. I replaced the legacy example with a current Kea DHCPv6 configuration using supported `subnet6`, `pools`, and `option-data` syntax.
- The verification commands used outdated/less portable examples (`ping6`) and invalid sample addresses. I updated them to `ping -6`, corrected the prefixes, and switched the lease-file example to Kea's memfile path.
- The closing paragraph incorrectly grouped DNSSL with public resolver advertisement. DNSSL carries search domains, not resolver addresses, so I corrected the text to refer to RDNSS for guest DNS resolvers.

## Review Notes
- `nft -c` could not be executed successfully in this sandbox because netlink access is blocked here; the nftables snippet was validated against the official nftables documentation instead.
- The Kea JSON example and shell script example were sanity-checked locally after patching. The shell example passes `bash -n`, and the Kea object parses cleanly as JSON once the file-path comment line is excluded.
