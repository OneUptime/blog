# Validation Summary: How to Set Up WireGuard with NAT Traversal on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard (VPN protocol and `wg`/`wg-quick` tools)
- Ubuntu (apt package manager, systemd)
- Linux networking (iptables, nftables, UFW, sysctl IP forwarding)
- Curve25519 cryptography (WireGuard key pairs)
- NAT traversal / persistent keepalive
- ddclient (dynamic DNS)

## Sources Consulted
- Official WireGuard documentation: https://www.wireguard.com/
- WireGuard quickstart: https://www.wireguard.com/quickstart/
- WireGuard man pages: `wg(8)` and `wg-quick(8)` — https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8 and `wg-quick.8`
- WireGuard conf format documentation
- wireguard-tools `contrib/reresolve-dns/reresolve-dns.sh` (re-resolution helper script)
- Ubuntu package: `wireguard` and `wireguard-tools` in the Ubuntu archive
- iptables MASQUERADE/FORWARD man pages
- nftables wiki: https://wiki.nftables.org/
- UFW man page (`ufw route` syntax)

## Issues Found
- **Incorrect claim about hostname re-resolution.** The post originally stated "WireGuard resolves the endpoint hostname periodically." This is wrong — neither the kernel WireGuard module nor `wg-quick` automatically re-resolve `Endpoint` hostnames after the interface starts. Re-resolution is only done at interface bring-up, or via the `contrib/reresolve-dns.sh` helper script in wireguard-tools, or manually via `wg set ... endpoint`. I rewrote the comment to clarify that hostname resolution happens only at `wg-quick up` time and that the user must restart the interface or run `wg set` to update the endpoint after a DNS change.

## Review Notes
- The 25-second `PersistentKeepalive` value matches WireGuard's officially recommended value for NAT traversal.
- `wg genkey | sudo tee /etc/wireguard/privatekey | wg pubkey | sudo tee /etc/wireguard/publickey` briefly writes the private key with default permissions before the subsequent `chmod 600`. This is the standard pattern shown in most tutorials; setting `umask 077` first would be slightly safer but is a minor stylistic point.
- The `DNS = 10.0.0.1` option in the client `[Interface]` block requires `resolvconf` or `openresolv` to be installed for `wg-quick` to apply it. Not a technical error in the post, just a deployment caveat.
- `nc -u -z -v` for verifying a UDP port is inherently unreliable because UDP is connectionless — it can only detect closed ports via ICMP unreachable responses. The post uses it as a quick check, which is the common practice, though not definitive.
- The nftables example uses numeric priorities (`100` for srcnat, `0` for filter), which is valid; the equivalent symbolic forms (`priority srcnat;` / `priority filter;`) would also work on modern nftables.
- For Scenario 2 (relay), the relay must have IP forwarding enabled and the FORWARD chain must allow VPN-to-VPN traffic — the post covers IP forwarding in a later section but does not explicitly call out the cross-peer forwarding requirement. With the default FORWARD ACCEPT policy this works, so it's not strictly an error.
- The post characterizes WireGuard as "UDP-based and stateless" in contrast to OpenVPN. OpenVPN also supports UDP, so the contrast is really about WireGuard's connectionless/stateless design rather than its transport. Minor wording imprecision, not a technical error.
