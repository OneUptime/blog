# Validation Summary: How to Configure Layer 4 IPv6 Load Balancing on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux IPVS / `ipvsadm`
- `nftables`
- `ip6tables` / Netfilter NAT
- HAProxy
- Layer 4 TCP/UDP load balancing

## Sources Consulted
- `ipvsadm(8)` Debian manpage: https://manpages.debian.org/testing/ipvsadm/ipvsadm.8.en.html
- nftables load balancing wiki: https://wiki.nftables.org/wiki-nftables/index.php/Load_balancing
- nftables man page: https://www.netfilter.org/projects/nftables/manpage.html
- HAProxy 3.2 configuration manual: https://docs.haproxy.org/3.2/configuration.html
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Installed CLI help and translation tools: `ip6tables -j DNAT -h`, `ip6tables -m statistic -h`, `ip6tables -j MASQUERADE -h`, `ip6tables-translate`
- Installed `nft` parser for syntax checks (`nft -c`); full netlink validation was not possible in this environment due missing privileges

## Issues Found
- The post used pseudo-host labels inside IPv6 literals such as `2001:db8::vip` and `2001:db8::server1`, which are not valid IPv6 addresses. I replaced them with valid RFC 3849 documentation addresses so the examples are syntactically correct.
- The IPVS examples used `-6` with address-based IPv6 services. Current `ipvsadm` documentation shows bracketed IPv6 addresses for `-t` and `-u` services, while `-6` is for IPv6 fwmark services. I removed `-6` from those commands.
- The IPVS NAT examples were missing IPv6 forwarding enablement. I added `sudo sysctl -w net.ipv6.conf.all.forwarding=1` because the examples use NAT mode (`-m`).
- The nftables "round-robin" example used `numgen random`, which is random distribution rather than round-robin. I changed it to `numgen inc`.
- The nftables DNAT maps used `[addr]:port` values in a form that did not match the upstream load-balancing examples and failed local syntax parsing. I changed those map values to address-only DNAT targets, which preserves the original destination port.
- The nftables and `ip6tables` masquerade examples matched the source subnet and described the rule as applying to "return traffic", which is inaccurate for the shown NAT-balancer flow. I changed them to match traffic headed toward the backend subnet and updated the comments.
- The HAProxy frontend used `v6only` on an explicit IPv6 bind address. HAProxy documents `v6only` as applying when binding the default address, so I removed it.
- The HAProxy backend used `option tcp-check` without any `tcp-check` sequence. Since `server ... check` already enables the default TCP connect health check, I removed the extra directive.

## Review Notes
- The `ip6tables` method is technically valid, but on current Linux distributions it is often a compatibility frontend over the nftables backend. The post's separate `nftables` method remains the more modern native interface.
- The NAT-mode examples now assume a backend-facing subnet and interface (`2001:db8:1::/64` on `eth1`) so the SNAT/MASQUERADE examples are coherent.
