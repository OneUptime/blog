# Validation Summary: How to Set Up Port Forwarding with NAT

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `iptables`
- Linux `nftables`
- Linux IPv4 forwarding and connection tracking
- Cisco IOS NAT
- IPv4 port forwarding / DNAT

## Sources Consulted
- `iptables-extensions` man page: https://ipset.netfilter.org/iptables-extensions.man.html
- Netfilter NAT HOWTO, destination NAT and same-network hairpin behavior: https://www.netfilter.org/documentation/HOWTO/NAT-HOWTO-10.html
- Netfilter NAT HOWTO, DNAT and masquerade behavior: https://nftables.org/documentation/HOWTO/NAT-HOWTO-6.html
- `nftables` NAT documentation: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- `nftables` man page: https://netfilter.org/projects/nftables/manpage.html
- Linux kernel IP forwarding sysctl documentation: https://docs.kernel.org/6.14/networking/ip-sysctl.html
- `conntrack-tools` user manual: https://conntrack-tools.netfilter.org/manual.html
- Cisco NAT configuration guide: https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/13772-12.html
- Cisco IOS NAT configuration reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/12-2sx/nat-12-2sx-book/iadnat-addr-consv.html

## Issues Found
- The `iptables` examples only permitted the inbound leg of the forwarded connection. I added reverse `FORWARD` rules for `ESTABLISHED,RELATED` traffic and used `-m conntrack --ctstate` so the examples work with restrictive `FORWARD` policies.
- The Linux example claimed `MASQUERADE` was needed for normal return traffic and applied it on `eth0`, which conflicted with the rest of the example. I removed that rule and corrected the takeaway to explain that SNAT/MASQUERADE is only needed in cases like hairpin NAT or when replies would not otherwise return through the NAT device.
- The `nftables` example used `table inet nat` without the required `ip` keyword in the DNAT statements. I changed the rules to `dnat ip to ...`, which is the correct syntax for IPv4 addresses in the `inet` family.
- The Cisco IOS section omitted the prerequisite that interfaces must already be marked with `ip nat inside` and `ip nat outside`. I added a short note so the snippet is not misleading as a standalone configuration.
- The port-range example used `--to-destination 192.168.1.10:8000-8010` even though the example was forwarding to the same destination ports. I changed it to `--to-destination 192.168.1.10`, which preserves the original ports and matches the described behavior.
- The key takeaway said to always add a `FORWARD` rule. I narrowed that claim to restrictive `FORWARD` policies, which is the technically correct condition.

## Review Notes
- `echo 1 > /proc/sys/net/ipv4/ip_forward` is technically correct, but it is a runtime change rather than a persistent system configuration.
- `iptables` is still valid, but `nftables` is the current Linux packet filtering and NAT framework.
- The `nftables` example retains an empty `postrouting` NAT base chain. This remains compatible with older kernels where both `prerouting` and `postrouting` NAT base chains were required for reverse translation.
