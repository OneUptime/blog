# Validation Summary: How to Debug WireGuard Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- WireGuard (kernel module and wg-quick)
- `wg` CLI tool (wireguard-tools)
- Linux networking: `ip`, `iptables`, `ufw`, `firewalld`
- Diagnostic tools: `nc` (netcat-openbsd), `traceroute`, `mtr`, `tcpdump`, `ping`, `dig`
- `stun-client` (Vovida STUN)
- systemd-resolved (`resolvectl`)
- Linux kernel dynamic_debug (`/sys/kernel/debug/dynamic_debug/control`)

## Sources Consulted
- WireGuard official documentation: https://www.wireguard.com/
- WireGuard quickstart and conf format: https://www.wireguard.com/quickstart/
- `wg(8)` man page: https://manpages.debian.org/unstable/wireguard-tools/wg.8.en.html
- `wg-quick(8)` man page: https://manpages.debian.org/unstable/wireguard-tools/wg-quick.8.en.html
- WireGuard whitepaper (handshake / Noise protocol): https://www.wireguard.com/papers/wireguard.pdf
- Linux kernel dynamic debug docs: https://www.kernel.org/doc/html/latest/admin-guide/dynamic-debug-howto.html
- `traceroute(8)`, `mtr(8)`, `nc(1)` man pages
- Discussion of WireGuard MTU calculation (1500 - 80 IPv6 overhead = 1420 default)

## Issues Found
1. **MTU ping comment** — In Step 7, the comment originally read `1392 + 28 (ICMP header) = 1420`. The 28-byte overhead is the IPv4 header (20 bytes) plus the ICMP header (8 bytes), not just ICMP. Updated to `1392 + 28 (IP + ICMP headers) = 1420` for technical accuracy.

## Review Notes
- The default WireGuard MTU of 1420 (1500 − 80) is the conservative IPv6-aware value. For IPv4-only paths the overhead is 60 bytes (IPv4 20 + UDP 8 + WG 32), so 1440 would also work. The post's explanation is correct.
- WireGuard public/private keys are 32-byte Curve25519 keys encoded in base64, producing exactly 44 characters (45 including trailing newline) — the script's length check is accurate.
- `wg show <iface> {public-key, peers, endpoints, allowed-ips}` subcommands are all valid per the `wg(8)` man page.
- `nc -vzu` UDP probing is best-effort: since WireGuard sends no response to unauthenticated probes, a "succeeded" result only means the local stack didn't get an ICMP unreachable. The post correctly cautions readers about this.
- `traceroute -U -p 51820` and `mtr -u -P 51820` flags are correct for the Linux versions of those tools.
- `stun stun.l.google.com:19302` works with the Vovida `stun-client` package on Debian/Ubuntu, which accepts the `host:port` form.
- Dynamic debug command for the wireguard module is correct, but requires debugfs to be mounted at `/sys/kernel/debug` (default on most distros).
- `resolvectl status wg0` requires systemd-resolved; on non-systemd systems users should inspect `/etc/resolv.conf` and other resolvers instead. Not an error, just a caveat.
- The `PersistentKeepalive = 25` recommendation is the canonical value from upstream WireGuard guidance for traversing typical NAT timeouts.
