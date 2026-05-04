# Validation Summary: How to Configure a WireGuard VPN with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- WireGuard VPN
- systemd-networkd
- Linux networking (.netdev / .network files)
- `wg` userspace tool (wg genkey, wg pubkey, wg show)
- `ip` and `ping` utilities
- `systemctl` / `networkctl`

## Sources Consulted
- systemd.netdev(5) man page — https://manpages.debian.org/testing/systemd/systemd.netdev.5.en.html (verified [WireGuard] and [WireGuardPeer] section options: PrivateKeyFile, ListenPort, PublicKey, AllowedIPs, Endpoint, PersistentKeepalive)
- systemd.network(5) man page — https://manpages.debian.org/testing/systemd/systemd.network.5.en.html (verified [Match], [Network], [Route] section names and that explicit routes are required since systemd-networkd does not auto-add routes from AllowedIPs)
- WireGuard documentation — https://www.wireguard.com/quickstart/ (verified `wg genkey | wg pubkey` key derivation pattern and `PersistentKeepalive=25` recommendation for NATed peers)

## Issues Found
No technical issues found.

All configuration sections and directives match the systemd-networkd manual:
- `[NetDev]` with `Kind=wireguard` is correct.
- `[WireGuard]` accepts `ListenPort` and `PrivateKeyFile` (PrivateKeyFile is the documented secure alternative to inline `PrivateKey`).
- `[WireGuardPeer]` accepts `PublicKey`, `AllowedIPs`, `Endpoint`, and `PersistentKeepalive` as shown.
- `.network` `[Match]`, `[Network]`, and `[Route]` (singular) section names are correct.
- The post correctly notes that an explicit `[Route]` is needed to route 0.0.0.0/0 through the tunnel — systemd-networkd does not auto-install routes derived from `AllowedIPs` by default.
- Verification commands (`wg show wg0`, `ip addr show wg0`, `networkctl status wg0`, `systemctl restart systemd-networkd`) are all valid.
- The `wg genkey | tee FILE | wg pubkey` pipeline is a standard WireGuard idiom and works correctly because `tee` writes to the file and forwards stdin to stdout for `wg pubkey`.

## Review Notes
- Minor security caveat (not incorrect, just worth noting): the `tee` writes the private key with the user's default umask before the subsequent `chmod 600`, leaving a brief window where the key file may be world-readable. A more defensive form would be `(umask 077; wg genkey | tee /etc/systemd/network/wg0.key | wg pubkey > /etc/systemd/network/wg0.pub)`. The post's approach is the most commonly published pattern, and the chmod immediately afterward closes the window quickly.
- The `[Route] Destination=0.0.0.0/0` snippet works without a `Gateway=` because WireGuard is a point-to-point device and the route binds to the matched interface. This is correct but could be made more explicit for less experienced readers.
- Recent systemd versions (>= 244) support `RouteTable=` in `[WireGuard]`/`[WireGuardPeer]` to auto-install routes for AllowedIPs into a chosen table; not used in this post, but a useful future enhancement to mention.
