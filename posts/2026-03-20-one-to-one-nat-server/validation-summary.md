# Validation Summary: How to Configure 1:1 NAT for Server Hosting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- 1:1 NAT (one-to-one static NAT) networking concept
- Linux iptables (nat table: PREROUTING/POSTROUTING; filter table: FORWARD)
- Linux nftables (inet family NAT chains)
- Linux `ip` command (iproute2) for secondary IP assignment
- Cisco IOS static NAT (`ip nat inside source static`)
- conntrack utility for verifying NAT translations
- Linux IP forwarding via `/proc/sys/net/ipv4/ip_forward`

## Sources Consulted
- iptables-extensions(8) man page — DNAT and SNAT target syntax (`--to-destination`, `--to-source`)
- netfilter.org documentation on the NAT table chains and packet flow (https://www.netfilter.org/documentation/HOWTO/NAT-HOWTO.html)
- nftables wiki — Performing Network Address Translation (https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT))
- nftables wiki — Configuring chains: hook priorities `dstnat` (-100) and `srcnat` (100) (https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains)
- Linux kernel 5.2 / nftables 0.9.2 release notes confirming NAT support in the `inet` family
- Cisco IOS NAT configuration guide — `ip nat inside source static <local-ip> <global-ip>` and `ip nat inside`/`ip nat outside` interface commands
- iproute2 `ip-address(8)` man page — `ip addr add` with `/32` host route and `label` argument
- conntrack-tools documentation for `conntrack -L`

## Issues Found
No technical issues found.

- iptables DNAT/SNAT rules are syntactically correct and follow the standard 1:1 NAT pattern (DNAT in PREROUTING, matching SNAT in POSTROUTING).
- The FORWARD rules correctly reference the post-DNAT destination (192.168.1.10), which is right because the FORWARD chain is traversed after PREROUTING/DNAT translation.
- The nftables snippet uses the `inet` family with numerical priorities (-100 and 100), which are valid equivalents of the `dstnat` and `srcnat` named priorities.
- The Cisco static NAT syntax `ip nat inside source static <inside-local> <inside-global>` and the `ip nat inside`/`ip nat outside` interface designations are correct.
- The `ip addr add 203.0.113.10/32 dev eth1` form is the correct way to add a single host secondary IP, and the `label eth1:0` syntax is valid iproute2 usage.
- Documentation IP ranges (203.0.113.0/24 from RFC 5737 and 192.168.1.0/24 from RFC 1918) are appropriate for examples.

## Review Notes
- `echo 1 > /proc/sys/net/ipv4/ip_forward` is non-persistent. The post does not claim otherwise, but readers deploying this in production would typically also set `net.ipv4.ip_forward=1` in `/etc/sysctl.conf` or a sysctl.d drop-in. Not a correctness issue.
- The nftables `inet` family for NAT requires Linux kernel >= 5.2 and nftables >= 0.9.2. On older systems, the same configuration would need to use `table ip nat` instead. Not incorrect, just a version caveat worth being aware of.
- The note "If the ISP routes a /29 block to you, these IPs route to your interface automatically without needing to add them manually" is correct when the /29 is routed to a separate gateway IP (i.e., the /29 is a routed block, not a directly-connected subnet). If the /29 is the WAN subnet itself, proxy ARP or explicit interface assignment is typically still needed. The post's framing is acceptable but could be clearer.
- iptables rules as written are not persistent across reboots; production deployments would use `iptables-save`/`iptables-restore` or a service like `netfilter-persistent`/`iptables-services`. Out of scope for this tutorial.
