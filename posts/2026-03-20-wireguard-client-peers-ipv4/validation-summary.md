# Validation Summary: How to Configure WireGuard Client Peers with IPv4 Addresses

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- WireGuard VPN
- `wg` CLI tool (key generation, live peer configuration)
- `wg-quick` (interface bring-up, config file directives)
- Linux networking (IPv4, `/etc/wireguard/wg0.conf`)

## Sources Consulted
- Official WireGuard quickstart and documentation: https://www.wireguard.com/quickstart/
- `wg(8)` manpage: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- `wg-quick(8)` manpage: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- RFC 5737 (documentation-reserved IPv4 ranges, including 203.0.113.0/24)
- RFC 1918 (private address space 10.0.0.0/8)

## Issues Found
No technical issues found.

Specific items verified:
- `wg genkey | tee client_private.key | wg pubkey > client_public.key` — canonical key generation idiom per WireGuard quickstart.
- `chmod 600` on the private key — appropriate permissions.
- `[Peer]` server-side config with `PublicKey` and `AllowedIPs = 10.0.0.2/32` — correct; `/32` is the right mask for a single client route on the server.
- `wg set wg0 peer <pubkey> allowed-ips 10.0.0.2/32` — matches `wg(8)` syntax (the subcommand name is `allowed-ips` with a hyphen).
- Client `[Interface]` directives `PrivateKey`, `Address`, `DNS` — all valid `wg-quick` config keys.
- `Endpoint = 203.0.113.1:51820` — uses RFC 5737 documentation address and the default WireGuard UDP port.
- `PersistentKeepalive = 25` — matches the WireGuard-recommended value for NAT traversal.
- `wg-quick up wg0` and `wg show` — correct commands.

## Review Notes
- Minor stylistic nit (not changed because not technically incorrect): the client `Address = 10.0.0.2/24` implicitly adds a /24 route for the interface. Many guides prefer `/32` on the client `Address` with the subnet route coming from `AllowedIPs`, but the /24 form shown here also works and is widely used.
- The post correctly notes that a config-file change requires a restart while `wg set` performs a live update; this matches `wg-quick`/`wg` behavior.
- Uses reserved documentation IP (203.0.113.1) and RFC 1918 private range (10.0.0.0/24), which is the right convention for example configs.
