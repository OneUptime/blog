# Validation Summary: How to Set Up NAT (Network Address Translation) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (20.04+)
- Linux IP forwarding via sysctl (`net.ipv4.ip_forward`)
- iptables (legacy netfilter front-end) — MASQUERADE, SNAT, DNAT, FORWARD chain
- nftables (modern netfilter front-end) — `inet filter`, `ip nat`, prerouting/postrouting hooks
- iptables-persistent / netfilter-persistent
- Netplan (network configuration)
- conntrack (connection tracking)

## Sources Consulted
- netfilter/iptables documentation: https://www.netfilter.org/documentation/
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nftables NAT examples: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- Ubuntu manpages: `iptables(8)`, `nft(8)`, `sysctl(8)`, `netplan(5)`, `conntrack(8)`
- Debian/Ubuntu package: `iptables-persistent` (provides `netfilter-persistent` service)
- Linux kernel documentation: networking/ip-sysctl
- Netplan reference: https://netplan.readthedocs.io/

## Issues Found
No technical issues found.

Spot checks performed:
- `sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE` — correct.
- `sudo iptables -t nat -A POSTROUTING -o eth0 -j SNAT --to-source 203.0.113.10` — correct (uses TEST-NET-3 documentation prefix per RFC 5737).
- DNAT/PREROUTING and accompanying FORWARD rules — correct; the FORWARD chain sees post-DNAT destination IP/port, so `-d 192.168.1.20 --dport 22` after a 2222→22 DNAT is right.
- Hairpin NAT POSTROUTING rule — logically correct: matches source in LAN, destination at the post-DNAT internal IP, masquerades so the reply returns via the gateway.
- nftables syntax: `type nat hook prerouting priority -100;` and `type nat hook postrouting priority 100;` are valid numeric priorities (equivalent to named `dstnat` / `srcnat`). DNAT and `masquerade` statements parse correctly.
- `nft -c -f /etc/nftables.conf` — `-c` is the correct check-only flag.
- `iptables-persistent` package and `netfilter-persistent save` — correct.
- Netplan schema (`version: 2`, `renderer: networkd`, `ethernets:`, `addresses:`, `dhcp4:`) — correct.
- `sysctl --system`, `/etc/sysctl.d/99-*.conf` ordering — correct.

## Review Notes
- On Ubuntu 22.04+ the default `iptables` binary is `iptables-nft`, which translates iptables rules into the nftables backend. The two sections will therefore coexist, but mixing rules from both front-ends in production can be confusing — users should pick one. The post already steers readers toward nftables as the modern choice.
- Named priorities (`dstnat`, `srcnat`, `filter`) are the more idiomatic nftables style today, but the numeric equivalents used in the post (`-100`, `100`, `0`) are still valid and behave identically.
- `conntrack` requires the `conntrack` (a.k.a. `conntrack-tools`) package, which isn't pulled in by default on minimal Ubuntu images. A reader following the verification section may need `sudo apt install conntrack`.
- The `iifname lo accept` line (unquoted) and the quoted `iifname "eth1"` lines both work; unquoted is fine for simple names without metacharacters.
- The hairpin NAT example is the minimum needed; in real deployments operators often also need a corresponding DNAT rule that matches the external IP from the LAN side, but the snippet as written is correct for the scenario described (combined with the DNAT in PREROUTING already shown earlier).
