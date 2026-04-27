# Validation Summary: How to Configure OpenVPN with IPv6 Support

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenVPN (server and client, 2.3+ / 2.4+)
- IPv6 (RFC 4291 addressing, RFC 3849 documentation prefix)
- Linux networking (tun device, sysctl, ip6tables)
- iptables / ip6tables (NAT, FORWARD, INPUT chains)
- DNS over IPv6 (Google Public DNS 2001:4860:4860::8888)
- nmap, ss, ping6, journalctl

## Sources Consulted
- OpenVPN 2.6 reference manual / `openvpn(8)` man page (sections `--proto`, `--remote`, `--server-ipv6`, `--ifconfig-ipv6-pool`, `--dhcp-option`, `--tun-ipv6`)
- community.openvpn.net wiki (Openvpn24ManPage / Openvpn26ManPage)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — `2001:db8::/32`)
- RFC 4291 (IP Version 6 Addressing Architecture)
- IANA IPv6 Global Unicast assignments (`2000::/3`)
- Linux `ip6tables(8)` and `sysctl` documentation for `net.ipv6.conf.all.forwarding`

## Issues Found
1. **Invalid IPv6 literal `2001:db8:vpn::/64`** — `v`, `p`, `n` are not valid hex digits, so this address fails IPv6 parsing per RFC 4291. Replaced with `2001:db8:0:1::/64` (a valid documentation-prefix address) in both `server.conf` (`server-ipv6` directive) and the `ip6tables -t nat -A POSTROUTING` rule.
2. **Invalid IPv6 literal `2001:db8::vpn-server`** — same hex-digit problem, plus the hyphen is not a legal IPv6 separator. Replaced with `2001:db8::1` in the client `remote` directive and the `nmap` troubleshooting command.
3. **Misleading comment about brackets in `remote`** — OpenVPN's `--remote` grammar is `remote host port [proto]` and does not accept square brackets around IPv6 literals. Updated the comment to say "no brackets in OpenVPN's remote directive" so readers don't try `remote [2001:db8::1] 1194` (which fails to parse).
4. **Redundant default-route push** — the post pushed both `route-ipv6 2000::/3` and `route-ipv6 ::/0`. `::/0` covers all of `2000::/3` plus future allocations, so pushing both is redundant. Removed the `2000::/3` line and kept the canonical `::/0`.
5. **`dhcp-option DNS6`** — current OpenVPN man pages document `dhcp-option DNS <addr>` as the canonical form (it accepts IPv4 or IPv6); `DNS6` was a transitional 2.4-era token that was folded into `DNS`. Updated to `dhcp-option DNS` for forward-compatibility.
6. **`tun-ipv6` comment** — the original comment `# Accept IPv6 routes` was inaccurate. `tun-ipv6` enables IPv6 capability on the tun device and is auto-enabled in OpenVPN 2.4+; per the man page it is only needed for older clients. Replaced the comment with an accurate note. The directive itself is preserved because the post's stated minimum is OpenVPN 2.3.

## Review Notes
- `proto udp6` does bind an IPv6 socket; on Linux the comment "listens on both IPv4 and IPv6" relies on the kernel default `net.ipv6.bindv6only=0`, not on OpenVPN itself. Operators with `bindv6only=1` must run a second instance for IPv4 or use `proto udp` with `multihome`. Left as-is, as the comment is correct for stock Linux.
- `ping6` is still functional but is being replaced by `ping -6` in modern iputils; either works on current distributions.
- `-m state --state ESTABLISHED,RELATED` works but is a backwards-compatibility alias; `-m conntrack --ctstate ESTABLISHED,RELATED` is the modern equivalent. Not changed because both are valid.
- `dh dh.pem` is not strictly needed in OpenVPN 2.5+ when the cipher uses ECDH, but is harmless and required for older clients. Left unchanged.
- The `pull` directive is implied by `client` and is redundant but harmless. Left unchanged.
