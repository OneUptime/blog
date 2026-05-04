# Validation Summary: How to Configure Static NAT on a Router

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cisco IOS NAT configuration
- Linux iptables (nat table, PREROUTING/POSTROUTING/FORWARD chains)
- Linux nftables (inet family, nat type chains)
- Linux netfilter conntrack
- IP forwarding via `/proc/sys/net/ipv4/ip_forward`

## Sources Consulted
- Cisco "Configuring Network Address Translation: Getting Started" — https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/13772-12.html
- Cisco IOS NAT command reference — `ip nat inside source static` syntax
- netfilter/iptables manual page (iptables-extensions(8)) for DNAT/SNAT targets
- nftables wiki — Performing Network Address Translation (https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT))
- nftables wiki — NAT chain support in `inet` family (since kernel 5.2 / nftables 0.9.2)
- conntrack-tools(8) man page
- RFC 5737 (documentation IP ranges, e.g. 203.0.113.0/24)
- RFC 1918 (private IP ranges, e.g. 192.168.0.0/16)

## Issues Found
No technical issues found.

## Review Notes
- Cisco syntax `ip nat inside source static <inside-local> <inside-global>` is correct (private IP first, then public).
- The terminology table correctly shows Outside Local = Outside Global = 8.8.8.8 — this is accurate because static NAT defined with `ip nat inside source static` only translates the inside addresses; outside addresses pass through unchanged.
- iptables FORWARD rules are correctly written: by the time a packet reaches FORWARD, PREROUTING DNAT has already rewritten the destination, so matching `-d 192.168.1.10` on inbound traffic is correct. SNAT happens after FORWARD in POSTROUTING, so matching `-s 192.168.1.10` on outbound traffic is also correct.
- The nftables example uses `inet` family for NAT, which requires Linux kernel 5.2+ and nftables 0.9.2+. This is fine for modern distributions but readers on older kernels would need to use the `ip` family instead. Worth a future caveat if the post is updated.
- The nftables priority values `-100` (prerouting) and `100` (postrouting) correspond to the named constants `dstnat` and `srcnat` and are correct.
- The `conntrack` command requires the `conntrack-tools` package on most distributions; readers may need to install it separately. Not an error, just a packaging note.
- All example IP addresses use RFC 5737 documentation range (203.0.113.0/24) and RFC 1918 private range (192.168.0.0/16), which is best practice.
