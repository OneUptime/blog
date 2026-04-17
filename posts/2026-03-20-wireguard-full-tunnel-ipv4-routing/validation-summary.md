# Validation Summary: How to Configure WireGuard Full Tunnel Routing for All IPv4 Traffic

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- WireGuard (wg, wg-quick)
- Linux policy routing (iproute2: `ip route`, `ip rule`)
- iptables (FORWARD, NAT/MASQUERADE)
- systemd-resolved / DNS configuration via `wg-quick`
- INI-style WireGuard configuration

## Sources Consulted
- wg-quick source code: https://git.zx2c4.com/wireguard-tools/tree/src/wg-quick/linux.bash
- wg-quick(8) man page: https://man.archlinux.org/man/wg-quick.8
- WireGuard official site: https://www.wireguard.com/
- iproute2 documentation on `suppress_prefixlength` and policy routing
- iptables-extensions(8) for MASQUERADE and FORWARD semantics

## Issues Found
**1. Incorrect description of how `wg-quick` handles the default route with `AllowedIPs = 0.0.0.0/0`.**

The original post claimed that `wg-quick` "adds the WireGuard server's IP as a host route via the original default gateway, then sets a fwmark-based policy route." The example included `ip route add 203.0.113.1/32 via 192.168.1.1`, which `wg-quick` does not actually do.

In reality, `wg-quick` uses **only** fwmark-based policy routing (no host route for the endpoint). Per the `wg-quick` source code, it runs approximately:

```
wg set wg0 fwmark 51820
ip -4 rule add not fwmark 51820 table 51820
ip -4 rule add table main suppress_prefixlength 0
ip -4 route add 0.0.0.0/0 dev wg0 table 51820
```

The encrypted tunnel packets are tagged with the fwmark by WireGuard itself, so the "not fwmark" rule excludes them from table 51820, letting them exit through the main table's default route.

I updated the "Why wg-quick Handles the Default Route Specially" section to reflect the actual mechanism, including the missing `suppress_prefixlength 0` rule and the fwmark-setting command.

## Review Notes
- The client and server `wg0.conf` examples are syntactically correct and use valid WireGuard configuration keys (`PrivateKey`, `Address`, `DNS`, `PublicKey`, `Endpoint`, `AllowedIPs`, `PersistentKeepalive`, `PostUp`, `PostDown`).
- The iptables `MASQUERADE` + `FORWARD` rules are correct. On modern distros that default to `nftables`, users may need the `iptables-nft` compatibility shim or to translate to `nft` rules, but the `iptables` syntax shown still works via the compatibility layer.
- IP forwarding (`net.ipv4.ip_forward=1`) on the server is a prerequisite that the post does not explicitly call out. Not technically wrong, but a common gotcha worth noting in a future revision.
- The DNS leak advice is accurate. Note that `DNS =` in `[Interface]` requires `resolvconf` or `openresolv` to be installed for `wg-quick` to apply it; otherwise the setting is silently ignored on some systems. Worth mentioning in a future revision.
- The default fwmark `51820` matches the default WireGuard port but is only the *starting* table number — `wg-quick` auto-increments if already in use. Mentioning this as the default is accurate.
- `curl https://ifconfig.me` and `ip route get 8.8.8.8` verification commands are correct.
