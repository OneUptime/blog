# Validation Summary: How to Troubleshoot SLAAC Problems on IPv6 Networks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- ICMPv6 Neighbor Discovery, Router Solicitations, and Router Advertisements
- Duplicate Address Detection (DAD)
- Linux IPv6 sysctl settings
- Linux iproute2, tcpdump, ip6tables, ndisc6/rdisc6, and radvd
- Cisco IPv6 Neighbor Discovery prefix advertisement settings

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4291: IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.0/networking/ip-sysctl.html
- pcap-filter(7) manual for tcpdump filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- rdisc6(8) and ndisc6(8) manuals: https://manpages.debian.org/testing/ndisc6/rdisc6.8.en.html and https://manpages.debian.org/testing/ndisc6/ndisc6.8.en.html
- radvd.conf(5) manual: https://manpages.debian.org/bookworm-backports/radvd/radvd.conf.5.en.html
- Cisco NX-OS IPv6 Neighbor Discovery prefix documentation: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus7000/sw/unicast/command/reference/n7k_unicast_cmds/l3_cmds_i.html

## Issues Found
- The flowchart used invalid shorthand for tcpdump RA capture. Changed it to the valid pcap filter `icmp6 and ip6[40] == 134`.
- The flowchart suggested grepping `TENTATIVE/DADFAILED`, which would not match Linux `ip` output. Changed it to `grep -E 'tentative|dadfailed'`.
- The passive RA capture comment implied RAs should always appear quickly. Updated it to note that periodic RAs may be minutes apart and that Router Solicitation should be used when needed.
- The `rdisc6` timeout claim said no RA within 3 seconds indicates a router issue. Updated it to the documented default retry behavior of about 12 seconds.
- The firewall note implied all RAs go to `ff02::1`. Updated it to distinguish periodic multicast RAs from solicited RAs that may be unicast.
- The ip6tables inspection command only grepped for `icmpv6`; updated it to also match `ipv6-icmp`, which is commonly printed by ip6tables tooling.
- The Cisco fix for a missing SLAAC A flag used an incorrect command pattern. Replaced it with guidance to remove `no-autoconfig` from the `ipv6 nd prefix` configuration.
- The post stated that SLAAC requires exactly `/64` in all cases. Narrowed this to Ethernet LANs, where `/64` is the normal SLAAC requirement because of the 64-bit interface identifier.
- The DAD failure check used uppercase `DADFAILED`, while Linux `ip` commonly prints lowercase address flags. Changed the command to `grep -i dadfailed` and adjusted the sample output.
- The static-conflict lookup used `arping6`, which is not the standard ndisc6 package command. Changed it to `ndisc6 <IPv6 address> <iface>`.
- The on-link route explanation did not mention the RA L flag or `noprefixroute`. Added those as the likely causes when the connected prefix route is missing.
- The link-local router ping hard-coded `fe80::1`, which is not universally the router's link-local address. Changed it to reuse the discovered `$ROUTER`.
- The forwarding section said forwarding auto-sets `accept_ra` to 0. Corrected this to the Linux kernel behavior: `accept_ra=1` is ineffective when forwarding is enabled, and `accept_ra=2` is required to accept RAs while forwarding.
- The conclusion said `accept_ra` must be 1 or 2 without context. Clarified that hosts should use 1, while forwarding interfaces that still need RAs should use 2.

## Review Notes
The `tcpdump` filters using `ip6[40]` are appropriate for normal Neighbor Discovery packets without IPv6 extension headers. For more general ICMPv6 capture, `icmp6` alone is broader but less specific.
