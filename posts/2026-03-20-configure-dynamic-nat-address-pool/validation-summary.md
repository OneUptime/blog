# Validation Summary: How to Configure Dynamic NAT with an Address Pool

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cisco IOS dynamic NAT
- Cisco IOS PAT / NAT overload concepts
- Cisco IOS ACL-based NAT matching
- Linux iptables `SNAT` with netfilter NAT
- IPv4 NAT terminology and behavior

## Sources Consulted
- Cisco "IP Addressing: NAT Configuration Guide, Cisco IOS XE Release 3S" — Network Address Translation Bindings: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/xe-3s/nat-xe-3s-book/nat-xe-3s-book_chapter_011011.html
- Cisco IOS IP Addressing Services Command Reference — `ip nat pool`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-i3.html
- Cisco "IP Addressing Configuration Guide, Cisco IOS XE 17.x" — TCP load distribution / destination address rotary translation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_iadnat-addr-consv-xe.html
- netfilter NAT HOWTO, section 6 ("Mappings In Depth"): https://netfilter.org/documentation/HOWTO/NAT-HOWTO-6.html
- Local `iptables -j SNAT --help` output on `iptables v1.8.10 (nf_tables)`
- Local `iptables-extensions(8)` man page

## Issues Found
- The original post said dynamic NAT pool exhaustion drops "new connections" and framed the pool size as a limit on concurrent connections. Cisco's NAT binding documentation describes dynamic NAT as a one-to-one binding between a local and global address that persists until its child sessions age out, so I corrected the wording to refer to concurrent translated hosts / fresh translations rather than every connection.
- The original `type rotary` example implied it was a round-robin option for ordinary inside-source dynamic NAT pools. Cisco documents `type rotary` as destination-address rotary translation for TCP load distribution to real inside hosts, so I replaced the incorrect example with a short explanatory note.
- The Linux section said the kernel would "distribute source IPs across the pool" without explaining selection behavior. The netfilter NAT HOWTO states that, for an address range, the least-used IP is chosen for new connections and ports are only remapped when needed, so I updated the explanation accordingly.
- The comparison table said dynamic NAT required multiple IPs. Cisco's `ip nat pool` syntax allows a pool definition generally, including a single-address pool, so I changed that row to "one or more IPs."

## Review Notes
- The Cisco configuration syntax in the main dynamic NAT example is correct: `ip nat pool`, numbered ACL matching, `ip nat inside source list ... pool ...`, and inside/outside interface roles all align with Cisco documentation.
- The sample `show ip nat translations` output is reasonable for dynamic NAT. Cisco shows a dynamic binding plus child session entries; session lines can include TCP/UDP ports even when PAT is not being used because the ports are tracked, not translated.
- The Linux `iptables` command remains syntactically valid on current systems, including the `iptables-nft` frontend. For new Linux deployments, native `nftables` is often preferred, but that is a future-improvement note rather than an error in this post.
