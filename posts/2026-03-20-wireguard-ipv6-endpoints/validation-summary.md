# Validation Summary: How to Configure WireGuard with IPv6 Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard VPN
- IPv6 addressing (ULA / RFC 4193, documentation prefix 2001:db8::/32 per RFC 3849)
- Linux networking (iptables, ip6tables, iproute2)
- wg-quick and systemd (wg-quick@.service)
- DNS (AAAA records), UDP, tcpdump, ss, nc (netcat)

## Sources Consulted
- WireGuard official documentation: https://www.wireguard.com/
- wg-quick(8) manual: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- wg(8) manual: https://man7.org/linux/man-pages/man8/wg.8.html
- RFC 4193 (Unique Local IPv6 Unicast Addresses — fc00::/7, fd00::/8)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — 2001:db8::/32)
- RFC 4291 (IPv6 Addressing Architecture — valid address characters are hex digits 0-9, a-f)
- RFC 3986 / RFC 5952 (bracket notation [IPv6]:port for URIs and endpoints)
- iptables(8) and ip6tables(8) manuals

## Issues Found
Several IPv6 addresses in the original post contained invalid characters. IPv6 literals per RFC 4291 may only contain hex digits (0-9, a-f), colons, and optionally the `::` zero-run shorthand — letters like `w`, `g`, `r`, `s` etc. are not valid.

1. **Server `Address = fd00:wg::/64`** — `wg` is not valid hex, and the address had no host portion (`::` at the end with nothing after is the subnet identifier, not a host). Changed to `fd00::1/64`, giving the server a proper host address within the ULA prefix. The `ping6` verification step (`ping6 fd00::1`) now matches.
2. **Server `AllowedIPs = fd00:wg::2/128, ...`** — Same invalid-hex issue. Changed to `fd00::2/128` to match the corrected client address.
3. **Client `Address = fd00:wg::2/64`** — Same invalid-hex issue. Changed to `fd00::2/64`.
4. **Client `Endpoint = [2001:db8::wireguard-server]:51820`** — `wireguard-server` is not valid hex and would cause wg-quick to fail parsing the endpoint. Changed to `[2001:db8::1]:51820`, using the RFC 3849 documentation prefix with a valid host portion.
5. **Verification `ping6 fd00:wg::1`** — Same invalid-hex issue; updated to `ping6 fd00::1` so it matches the corrected server tunnel address.
6. **Troubleshooting `nc -6 -u 2001:db8::wireguard-server 51820`** — Same invalid-hex issue; updated to `nc -6 -u 2001:db8::1 51820`.

All remaining content (bracket notation in `Endpoint`, `ListenPort`, `PersistentKeepalive`, `PostUp`/`PreDown` iptables/ip6tables rules, DNS via `2001:4860:4860::8888`, `wg genkey`/`wg pubkey` pipeline, `wg-quick up`, `wg show`, `ip -6 addr show`, `systemctl enable wg-quick@wg0`, `ss -6 -ulnp`, `tcpdump` UDP filter, `AllowedIPs = 0.0.0.0/0, ::/0` for full tunneling, hostname resolution behavior) was verified against the WireGuard and Linux manuals and is accurate.

## Review Notes
- `ping6` is considered deprecated on modern Linux distributions in favor of `ping -6` or plain `ping` (iputils). It still works on most systems, so it was left as-is to avoid non-technical changes, but consider updating to `ping -6` in a future revision.
- The private-key file is created by `tee` before `chmod 600` is applied, so there is a brief window where the key may be readable by other users depending on umask. A stronger pattern is `(umask 077; wg genkey | tee … | wg pubkey > …)`. Not wrong, but worth noting.
- Two `PostUp` / `PreDown` lines are used in the server config — wg-quick does support specifying these hooks multiple times (they are concatenated), so this is valid.
- The tutorial uses the ULA prefix `fd00::/64` for simplicity; RFC 4193 recommends generating a pseudo-random 40-bit Global ID (e.g., `fdxx:xxxx:xxxx::/48`) to minimize collision probability in production deployments.
- `PersistentKeepalive = 25` is the commonly recommended value for NAT traversal and matches WireGuard's documented guidance (slightly under the typical 30s NAT mapping timeout).
