# Validation Summary: How to Configure Hairpin NAT for Internal Access to Public Services

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- NAT hairpinning / NAT loopback / NAT reflection
- Linux `iptables`
- Linux `nftables`
- pfSense NAT Reflection
- Cisco IOS / IOS XE NAT
- TCP/IP routing and port forwarding

## Sources Consulted
- [RFC 5382: NAT Behavioral Requirements for TCP](https://www.rfc-editor.org/rfc/rfc5382)
- [iptables(8) Linux manual page](https://man7.org/linux/man-pages/man8/iptables.8.html)
- [iptables-extensions(8) Linux manual page](https://man7.org/linux/man-pages/man8/iptables-extensions.8.html)
- [nftables official man page](https://netfilter.org/projects/nftables/manpage.html)
- [nftables wiki: Performing Network Address Translation (NAT)](https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29)
- [pfSense Documentation: Accessing Port Forwards from Local Networks](https://docs.netgate.com/pfsense/en/latest/recipes/port-forwards-from-local-networks.html)
- [Cisco IOS NAT Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/15-mt/nat-15-mt-book.pdf)
- [Cisco IOS IP Addressing Services Command Reference (`show ip nat statistics`, `show ip nat translations`)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-cr-book_chapter_01000.html)

## Issues Found
- The Linux `iptables` example used `MASQUERADE` for the hairpin return path even though the example uses a static LAN address. I changed it to `SNAT --to-source 192.168.1.1` and scoped the external DNAT rule to `eth1`, because the official `iptables-extensions(8)` docs say `MASQUERADE` is intended for dynamically assigned addresses and static-address cases should use `SNAT`.
- The `nftables` `inet` NAT example used `dnat to` without the required `ip` family qualifier and used `masquerade` for the static hairpin return path. I changed the rules to `dnat ip to ...` and `snat ip to 192.168.1.1`, and added the Linux kernel 5.2+ note, because the official nftables documentation requires `ip`/`ip6` when specifying addresses in `inet` NAT rules and documents `inet` stateful NAT support as starting in Linux 5.2.
- The pfSense section used the label `Enable (Pure NAT)`. I corrected it to `Pure NAT` to match current Netgate documentation.
- The Cisco section incorrectly claimed that NAT loopback is automatic with the classic `ip nat inside` / `ip nat outside` model. I replaced it with platform-accurate guidance noting that hairpin NAT is platform-specific and that IOS/IOS XE NVI configurations use `ip nat enable`, plus safe verification commands from Cisco documentation.
- Two explanatory lines were too absolute: the “without hairpin NAT” diagram hard-coded a single failure mode, and the private-IP test said it would “always” work. I softened both statements so they remain technically correct across real deployments.

## Review Notes
- Netgate documents Split DNS as the preferred approach when possible, with NAT Reflection as the alternative when internal clients must use the public address. The post is still valid as a hairpin NAT guide.
- The corrected `nftables` example is specifically for `table inet nat`; equivalent `ip nat` table rules would not need the `ip` qualifier on `dnat`/`snat`.
