# Validation Summary: How to Implement RFC 1918 Private Addressing with NAT for Internet Access

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- RFC 1918 private IPv4 addressing
- Network Address Translation (NAT), NAPT, and PAT
- Linux IPv4 forwarding and sysctl configuration
- iptables MASQUERADE and forwarding rules
- Netfilter conntrack and conntrack-tools
- Cisco IOS NAT/PAT, static NAT, and NAT pools

## Sources Consulted
- RFC 1918: Address Allocation for Private Internets - https://www.rfc-editor.org/rfc/rfc1918
- RFC 3022: Traditional IP Network Address Translator (Traditional NAT) - https://datatracker.ietf.org/doc/html/rfc3022
- RFC 5737: IPv4 Address Blocks Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc5737
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- sysctl.d(5) Linux manual page - https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- iptables-extensions(8) Linux manual page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- iptables-save(8) Linux manual page - https://man7.org/linux/man-pages/man8/iptables-save.8.html
- conntrack-tools conntrack(8) manual page - https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- Cisco IOS NAT Configuration Guide - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/12-2sx/nat-12-2sx-book/iadnat-addr-consv.html
- Cisco Configure Network Address Translation support document - https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/13772-12.html

## Issues Found
- Clarified that RFC 1918 ranges are not globally routable on the public internet, instead of describing them as absolutely non-routable.
- Labeled the 203.0.113.0/24 addresses as RFC 5737 documentation examples so readers do not treat them as real assignable public addresses.
- Replaced "new random port" with "allocated translated port" because NAPT/PAT allocates a translated transport identifier; it is not necessarily random.
- Updated the iptables return path rule from `-m state --state ESTABLISHED,RELATED` to `-m conntrack --ctstate ESTABLISHED,RELATED`, matching the current conntrack extension.
- Qualified `iptables-save > /etc/iptables/rules.v4` as a Debian/Ubuntu `iptables-persistent` persistence path because it is not universal across all Linux distributions.
- Changed the verification block from `bash` to `text` because it mixes Linux shell commands and Cisco IOS commands.
- Corrected the `conntrack -C` comment because that command counts active conntrack table entries, not NAT sessions only.

## Review Notes
- The Linux iptables example is valid where iptables or iptables-nft is installed; many modern distributions prefer nftables or a distribution firewall frontend for new deployments.
- MASQUERADE is appropriate for interface-derived or dynamically assigned WAN addresses. For a fixed public address, an explicit SNAT rule may be preferable.
- The Cisco ACL example intentionally matches all RFC 1918 ranges. In production, restrict NAT ACLs to the private prefixes that should actually arrive from inside interfaces.
