# Validation Summary: How to Troubleshoot VPN IPv6 Connectivity Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- IPv6 networking
- WireGuard VPN
- OpenVPN
- strongSwan / IPsec
- iproute2 (`ip -6 addr`, `ip -6 route`, `ip xfrm`)
- ip6tables (filter and nat tables)
- ICMPv6 / `ping6`
- DNS over IPv6 (`dig`, `nslookup`)
- Linux sysctl (`net.ipv6.conf.all.forwarding`)
- nmap (IPv6 scanning)
- systemd journal (`journalctl`)
- MTU / path MTU on VPN tunnels

## Sources Consulted
- WireGuard man page and wg-quick(8) — https://www.wireguard.com/quickstart/ and https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- OpenVPN reference manual — https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/ (`server-ipv6`, `push "route-ipv6"`, `push "dhcp-option DNS6"`, `verb`)
- strongSwan swanctl documentation — https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- strongSwan logging documentation — https://docs.strongswan.org/docs/latest/config/logging.html
- iproute2 `ip-address(8)`, `ip-route(8)`, `ip-xfrm(8)` man pages
- iputils `ping(8)` / `ping6(8)` man pages
- netfilter ip6tables(8) man page
- Linux kernel IPv6 sysctl documentation (`Documentation/networking/ip-sysctl.rst`)
- RFC 8200 (IPv6 minimum MTU of 1280 bytes)
- Google Public DNS (IPv6 anycast `2001:4860:4860::8888`) — https://developers.google.com/speed/public-dns/docs/using

## Issues Found
1. **Invalid `swanctl --log-level` command** — The original post used `sudo swanctl --log-level ike:4,knl:4,cfg:3`. The `--log-level` flag does not exist in `swanctl`. The `ike:4,knl:4,cfg:3` syntax is the charon log configuration format used in `strongswan.conf`, not a CLI argument. Replaced with `sudo swanctl --log` (which streams log messages from the charon daemon) and added a comment showing how to raise log verbosity in `/etc/strongswan.conf` under `charon.filelog` and apply it with `sudo swanctl --reload-settings`.

## Review Notes
- `tun-ipv6` in OpenVPN client configs is a legacy/no-op option in OpenVPN 2.4+ (IPv6 on tun devices is enabled automatically when an IPv6 address is configured). It is not harmful, but mentioning it may confuse readers on modern OpenVPN. Not corrected because it does not actively break anything.
- `ping6` has been superseded on most modern distributions by `ping` (which auto-detects address family), but `ping6` is still shipped by iputils and works as a compatibility symlink on all current mainstream distros.
- IPv6 placeholder addresses such as `fd00:wg::2`, `fd00:internal::server`, and `2001:db8::vpn-server` contain non-hex tokens (`wg`, `server`, `vpn-server`) and are not literally valid IPv6 addresses. They are clearly placeholders from context; readers must substitute their own hex groups. Left as-is since the intent is illustrative, not copy-pasteable.
- WireGuard default MTU of 1420 accounts for worst-case IPv6 underlay overhead (1500 − 80 = 1420). The post says "WireGuard adds ~60 bytes" (which is correct for IPv4 underlay: 20 IP + 8 UDP + 32 WireGuard = 60). Both figures are defensible; no correction needed.
- `sudo ip -6 xfrm state show | grep src` works but the `-6` flag has limited effect for `ip xfrm` — acceptable as-is.
