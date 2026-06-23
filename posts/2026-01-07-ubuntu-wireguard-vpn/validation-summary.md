# Validation Summary: How to Configure WireGuard VPN on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- WireGuard (kernel module and `wireguard-tools` / `wg`, `wg-quick`)
- Ubuntu 20.04+ (server and client)
- macOS (Homebrew, WireGuard app)
- Windows (WireGuard app, Chocolatey, PowerShell)
- iptables / NAT / MASQUERADE
- UFW (Uncomplicated Firewall)
- iptables-persistent / netfilter-persistent
- systemd services and timers
- Linux `sysctl` IP forwarding
- qrencode (mobile QR provisioning)

## Sources Consulted
- WireGuard official documentation and quickstart — https://www.wireguard.com/quickstart/
- WireGuard protocol / cryptography (white paper) — https://www.wireguard.com/papers/wireguard.pdf
- `wg(8)` and `wg-quick(8)` man pages (subcommands and config fields)
- WireGuard install page (clients) — https://www.wireguard.com/install/
- Linux kernel networking sysctl docs (ip_forward, forwarding) — https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- iptables / netfilter MASQUERADE and conntrack documentation
- Microsoft PowerShell variable expansion behavior (`$name` interpolation in double-quoted/unquoted strings)

## Issues Found
1. **PowerShell service-start command would not work as written.** The Windows section instructed `net start WireGuardTunnel$wg0` in a PowerShell context. PowerShell treats `$wg0` as a variable reference and expands it to an empty string, so the command would resolve to `net start WireGuardTunnel` and fail. Fixed by single-quoting the literal service name (`net start 'WireGuardTunnel$wg0'`) and adding a brief comment explaining that the Windows tunnel service is named `WireGuardTunnel$<tunnel-name>`.
2. **Inaccurate code comment on key generation.** A comment claimed "The umask ensures the private key is only readable by root," but no `umask` is set in that block — the restriction actually comes from the subsequent `chmod 600`. Updated the comment to reference the `chmod` so the explanation matches the code.

## Review Notes
- The cryptographic primitives listed (ChaCha20, Curve25519, Poly1305, BLAKE2s, SipHash24) are correct per the WireGuard protocol design.
- The "~4,000 lines vs OpenVPN 100,000+ lines" and the performance/throughput comparisons are commonly cited, order-of-magnitude claims and are reasonable as general characterizations rather than precise benchmarks.
- `wg show wg0 transfer`, `wg show all`, `wg-quick strip wg0`, and the dynamic-debug logging commands are all valid and current.
- macOS caveat (not changed): the post places the config at `/usr/local/etc/wireguard/wg0.conf` (Intel Homebrew prefix). On Apple Silicon the Homebrew prefix is `/opt/homebrew`, and `wg-quick up wg0` resolves config names against the standard search paths. Readers on Apple Silicon may need to adjust the path or pass the full config path to `wg-quick`. The post primarily recommends the GUI app for macOS, so this is a minor caveat rather than an error.
- Client `Address = 10.0.0.x/24` with a server-side peer `AllowedIPs = 10.0.0.x/32` is a valid and common pattern; both forms work.
- All commands assume `eth0` as the WAN interface, and the post correctly instructs readers to substitute their actual interface (with the `ip route show default` helper).
