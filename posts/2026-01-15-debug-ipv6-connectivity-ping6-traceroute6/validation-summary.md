# Validation Summary: How to Debug IPv6 Connectivity Issues with ping6 and traceroute6

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- IPv6 addressing (RFC 4291) and ICMPv6 (RFC 4443)
- `ping6` (iputils)
- `traceroute6` (Dmitry Butskoy's traceroute package)
- `ip` / iproute2 (`ip -6 addr`, `ip -6 route`, `ip -6 neigh`, `ip -6 monitor`)
- `ip6tables` / netfilter (ICMPv6 filtering, TCPMSS clamping)
- `sysctl` IPv6 kernel knobs (`disable_ipv6`, `accept_ra`, `dad_transmits`)
- `dig`, `/etc/resolv.conf`, systemd-resolved / `resolvectl`
- `tcpdump`, `mtr`, `curl`, `nc`, `ss`, `netstat`
- Docker IPv6 networking, Kubernetes dual-stack, cloud CLIs (AWS/GCP/Azure)
- systemd-networkd (`networkctl`)

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (address formats, ::1, fe80::/10, ff02::1, ff02::2, ULA fc00::/7) — https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4443 — ICMPv6 (echo request/reply, neighbor discovery message types) — https://datatracker.ietf.org/doc/html/rfc4443
- iputils `ping`/`ping6` man page (flags `-c`, `-i`, `-s`, `-I`, `-M`, `-S`, `-t`, `-f`, `-D`, `-W`, `-v`, `-n`) — https://manpages.debian.org/bookworm/iputils-ping/ping.8.en.html
- traceroute (Butskoy) man page — syntax `traceroute [options] host [packetlen]`, `-s src_addr`, `-T`, `-U`, `-I`, `-q`, `-m`, `-w`, `-p`, `-i`, `-n` — https://manpages.debian.org/bookworm/traceroute/traceroute.8.en.html
- iproute2 `ip-address(8)` and `ip-route(8)` man pages (`scope global`, `tentative` filter, `route get`, `flush cache`)
- ip6tables / netfilter ICMPv6 match documentation
- Cross-checked well-known resolver addresses: Google 2001:4860:4860::8888, Cloudflare 2606:4700:4700::1111, Quad9 2620:fe::fe

## Issues Found
1. **`traceroute6` packet-size example used the wrong flag.** The "Set Packet Size" section showed `traceroute6 -s 1400 2001:4860:4860::8888`. In the Linux/Butskoy `traceroute6`, `-s` selects the **source address** (as the post itself correctly states in the "Specify Source Address" section and in the summary table), while the packet length is a trailing **positional argument**. Using `-s 1400` would be interpreted as a source address and fail. Fixed to `traceroute6 2001:4860:4860::8888 1400` and clarified that packet length is a positional argument.

## Review Notes
- The continuous-ping example output in Scenario 2 shows `Request timeout for icmp_seq 101`, which is BSD/macOS `ping` phrasing rather than Linux iputils output (which prints a `[timestamp]` prefix with `-D` and, with `-O`, `no answer yet for icmp_seq=101`). This is illustrative example output, not a command error, so it was left as-is.
- `traceroute6 -U` is labeled "(default)". UDP is indeed the default probe protocol, though strictly `-U` sends UDP to a fixed port (default 53) rather than the increasing-port default. The nuance is minor and the comment is acceptable.
- `systemd-resolve --set-dns ...` (Issue 3) still works but is a legacy alias; modern systems prefer `resolvectl dns <iface> <addr>`. The post already demonstrates `resolvectl` elsewhere, so this was left as a working command.
- `ping6 -t 64` correctly maps to the IPv6 hop limit in the unified iputils `ping` binary.
- All address types, ICMPv6 firewall rules, sysctl knobs, and the 1280-byte IPv6 minimum-MTU guidance are accurate.
