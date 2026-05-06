# Validation Summary: How to Use Carrier-Grade NAT (CGN) for IPv4 Address Sharing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Carrier-Grade NAT (CGN / NAT444)
- IPv4 shared address space (`100.64.0.0/10`, RFC 6598)
- Linux `iptables` / Netfilter NAT
- Linux conntrack and `sysctl` tuning
- ISC DHCP (`dhcpd.conf`)
- IPv6 transition mechanisms (`NAT64` / `DNS64`)

## Sources Consulted
- RFC 6598: https://www.rfc-editor.org/rfc/rfc6598
- RFC 6888: https://www.rfc-editor.org/rfc/rfc6888
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel conntrack sysctl documentation: https://docs.kernel.org/networking/nf_conntrack-sysctl.html
- `iptables-extensions(8)` reference: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- conntrack-tools manual: https://conntrack-tools.netfilter.org/manual.html
- ISC DHCP `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP end-of-life notice: https://kb.isc.org/docs/isc-dhcp-eol-dates
- RFC 6146: https://www.rfc-editor.org/rfc/rfc6146
- RFC 6147: https://www.rfc-editor.org/rfc/rfc6147

## Issues Found
- The post used `net.ipv4.ip_local_port_range` as if it controlled CGN translation ports. I replaced that with `MASQUERADE --to-ports` examples because `ip_local_port_range` applies to local socket port selection, not NAT port-pool sizing.
- The reverse forwarding example used the older `state` matcher. I updated it to `-m conntrack --ctstate ESTABLISHED,RELATED`, which matches the current Netfilter documentation.
- The RFC 6598 overview used loose wording for the pool size and reachability. I tightened that to `4,194,304 addresses` and `not globally routable`.
- The DHCP pool included `100.64.0.1` while also assigning that address as the default gateway. I changed the pool to start at `100.64.0.2`.
- The conntrack tuning section described `nf_conntrack_max` as the current table size. I corrected that wording to describe it as the table limit.
- The logging example implied that `LOG` in `nat` `POSTROUTING` would record full CGN subscriber-to-public mappings. I replaced it with a `conntrack -E` example that captures new connection-tracking events and adjusted the surrounding text accordingly.
- The post stated logging as a universal legal requirement. I softened that language to reflect that logging needs depend on abuse-handling and legal/regulatory context.
- The `MASQUERADE` example was presented too generally. I clarified that it is the right choice when the outside IP is dynamically assigned.
- The conclusion implied NAT64 alone as a blanket replacement for CGN. I corrected that to `NAT64/DNS64 where appropriate`.

## Review Notes
- ISC DHCP 4.4 is end-of-life according to ISC. The `dhcpd.conf` syntax shown here is still valid where `dhcpd` is deployed, but new greenfield deployments usually use Kea instead.
- `nftables` is the newer Netfilter interface. The `iptables` commands in the post are still technically valid, especially on systems using the `iptables-nft` frontend.
