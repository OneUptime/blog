# Validation Summary: How to Configure PAT (Port Address Translation) / NAT Overload

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered

- PAT (Port Address Translation) / NAT Overload
- Cisco IOS NAT configuration (access-lists, NAT pools, interface NAT)
- Linux iptables (MASQUERADE, SNAT, FORWARD chain, state matching)
- Linux nftables (inet family NAT, postrouting hook)
- iptables-persistent / netfilter-persistent (Debian/Ubuntu)
- iptables-services (RHEL/CentOS)
- conntrack-tools (Linux NAT verification)

## Sources Consulted

- Cisco IOS NAT Configuration Guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/15-mt/nat-15-mt-book.html
- Cisco IOS `ip nat inside source` command reference (overload keyword)
- netfilter / iptables MASQUERADE and SNAT documentation: https://netfilter.org/documentation/
- iptables(8) man page (POSTROUTING chain, NAT table, --to-source range syntax)
- nftables wiki - NAT: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- nftables inet family NAT support (kernel 5.2+): https://wiki.nftables.org/wiki-nftables/index.php/Main_differences_with_iptables
- conntrack-tools documentation: https://conntrack-tools.netfilter.org/
- Debian iptables-persistent / netfilter-persistent package docs
- RFC 2663 (IP Network Address Translator Terminology) and RFC 3022 (Traditional NAT)

## Issues Found

No technical issues found.

## Review Notes

- The `-m state --state RELATED,ESTABLISHED` syntax used in the FORWARD rules is the legacy `state` match; the modern equivalent is `-m conntrack --ctstate RELATED,ESTABLISHED`. Both still work and `state` is implemented as an alias for `conntrack` in current iptables, so this is correct, just slightly dated style.
- The nftables example uses the `inet` (dual-stack) family for NAT. NAT support in the `inet` family was added in Linux kernel 5.2 (released June 2019). On older kernels, the `ip` family must be used instead. Most modern distributions ship with sufficiently new kernels, so this is fine for current readers.
- On RHEL/CentOS 7+ the default firewall is firewalld. The `service iptables save` command requires installing the `iptables-services` package and stopping/disabling firewalld. The post would benefit from a small note on that, but the command itself is correct when iptables-services is in use.
- The Cisco NAT pool example uses a single-address range (`203.0.113.1 203.0.113.1`) which is valid syntax for a one-IP overload pool; some operators prefer `prefix-length 24` over `netmask 255.255.255.0` but both forms are accepted by IOS.
- The "~65,535 connections per public IP" figure is the commonly quoted theoretical ceiling. In practice it is per (public IP, protocol, destination IP, destination port) tuple, so real-world capacity can be higher. The simplified figure is acceptable for an introductory post.
- Default Cisco IOS PAT port range is 1024–65535, which matches the example translations shown at the top of the post.
