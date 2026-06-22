# Validation Summary: How to Configure IPv6 Tunnel Broker for IPv6 Access Over IPv4

## Status
validated

## Post Type
Tutorial / Guide (step-by-step configuration walkthrough)

## Technologies Covered
- IPv6 / IPv4 tunneling (6in4, 6to4, Teredo, AYIYA)
- Hurricane Electric tunnelbroker.net
- Linux iproute2 (`ip tunnel`, `ip -6 route`, `ip addr`) and legacy `ifconfig`/`route`
- FreeBSD `gif` interfaces and `/etc/rc.conf`
- Persistent config: `/etc/network/interfaces` (ifupdown `v4tunnel`), RHEL `ifcfg`, systemd-networkd `.netdev`/`.network`
- Firewalling: iptables/ip6tables, nftables, firewalld
- DNS: resolv.conf, systemd-resolved, gai.conf
- radvd (SLAAC) and ISC DHCPv6
- sysctl network tuning (BBR, socket buffers, RA/redirect hardening)

## Sources Consulted
- IETF RFC 4213 (Basic Transition Mechanisms — 6in4 / IP protocol 41 encapsulation)
- IETF RFC 3056 (6to4, 2002::/16) and RFC 4380 (Teredo, UDP 3544)
- IETF RFC 8200 (IPv6 minimum MTU of 1280)
- IETF RFC 3484 / `gai.conf(5)` man page and the on-system `/etc/gai.conf` default precedence table
- Linux `ip-tunnel(8)` / iproute2 documentation
- Linux kernel networking sysctl documentation (`Documentation/networking/ip-sysctl.txt`) and live verification on a Linux host (`/proc/sys/net/...`)
- systemd `systemd.netdev(5)` / `systemd.network(5)` man pages
- Hurricane Electric tunnelbroker.net example configurations and dynamic-update API
- FreeBSD Handbook (gif interface / `rc.conf` IPv6 tunnel configuration)

## Issues Found
1. **`/etc/gai.conf` precedence comment was backwards (Troubleshooting, Issue 5, Solution 3).** The post stated "Ensure IPv6 is preferred" immediately above `echo "precedence ::ffff:0:0/96 100"`. Per RFC 3484 and the gai.conf man page (confirmed against the on-disk default file, which reads "For sites which prefer IPv4 connections change the last line to `precedence ::ffff:0:0/96 100`"), IPv6 is already the default preference, and a precedence of 100 on the IPv4-mapped range makes **IPv4** preferred — the opposite of the comment. Updated the comment to accurately state that IPv6 is preferred by default and that the shown line is an opt-in workaround to prefer IPv4 when IPv6 is unreliable.

2. **Non-existent `net.ipv6.tcp_rmem` / `net.ipv6.tcp_wmem` sysctls (Performance Optimization, section 3).** These keys do not exist; verified that only `/proc/sys/net/ipv4/tcp_rmem` and `/proc/sys/net/ipv4/tcp_wmem` are present (`net.ipv6.tcp_rmem` returns "No such file or directory"). The TCP stack is shared between IPv4 and IPv6, so buffer sizing is controlled via the `net.ipv4.tcp_rmem`/`tcp_wmem` keys, which also govern IPv6 TCP connections. Corrected both lines to `net.ipv4.*` and added a clarifying note.

## Review Notes
- The 6in4 / Protocol 41 explanation, encapsulation diagram, and tunnel type comparison (6in4, 6to4, Teredo UDP 3544, AYIYA) are accurate. SixXS is correctly noted as discontinued.
- Nice technical detail that checks out: the example link-local `fe80::cb00:7132` is the correct derivation of the IPv4 endpoint `203.0.113.50` (cb.00.71.32 hex).
- The RHEL/CentOS `ifcfg-he-ipv6` snippet uses variable names (`IPV6_TUNNELMODE`, `IPV6_TUNNELIPADDR4`) that differ from the traditional initscripts variable `IPV6TUNNELIPV4`. The legacy `network-scripts` package is deprecated in favor of NetworkManager on RHEL 8+, so this path is increasingly historical; the snippet was left as-is but readers on modern RHEL should prefer the systemd-networkd or NetworkManager approach.
- The systemd-networkd `.network` file includes a `Description=` key in the `[Network]` section, which is not a recognized key there (Description belongs in `[NetDev]`); it is harmless (ignored with a warning) and was left unchanged. `IPForward=ipv6` is valid but deprecated in recent systemd in favor of `IPv6Forwarding=`.
- FreeBSD `ipv6_enable="YES"` is an older rc.conf knob; modern FreeBSD favors `ipv6_activate_all_interfaces` plus per-interface settings, but the shown form still functions and is widely documented.
- The firewalld ICMPv6 example (`--add-icmp-block-inversion` + `--add-icmp-block=echo-request`) is convoluted relative to its "Allow ICMPv6" comment, but is not technically incorrect; left unchanged.
- IP-to-city mappings in the `mtr` latency examples are illustrative and not guaranteed to match HE's current PoP addressing.
