# Validation Summary: How to Set Up WireGuard Site-to-Site VPN Between Two IPv4 Networks

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- WireGuard (wg-quick, wg CLI)
- Linux networking (iproute2, sysctl)
- systemd (wg-quick@.service unit template)
- IPv4 routing and subnetting

## Sources Consulted
- WireGuard official documentation: https://www.wireguard.com/quickstart/
- WireGuard conf & quickstart: https://www.wireguard.com/#cross-platform
- wg(8) man page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- wg-quick(8) man page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- Linux kernel IP sysctl documentation (net.ipv4.ip_forward)
- ip-route(8) man page (iproute2)

## Issues Found
No technical issues found. All config syntax, CLI commands, port numbers, subnet assignments, and explanations are accurate.

## Review Notes
- The `PostUp = ip route add 192.168.2.0/24 dev wg0` (and corresponding `PostDown`) lines are technically redundant. `wg-quick` automatically adds routes for every entry in `AllowedIPs` to the wg0 interface when `Table = auto` (the default). The `PostUp` `ip route add` would therefore fail with "RTNETLINK answers: File exists" on startup, though `wg-quick` tolerates this non-zero exit without tearing the interface down. This is a common pattern in tutorials and does not break the setup, but readers could safely omit the PostUp/PostDown lines or set `Table = off` if they want to manage routes manually.
- The `/30` subnet for the tunnel (10.10.0.0/30) is a reasonable choice for a strict two-peer link, though WireGuard itself does not care about subnet sizing since it is a point-to-point tunnel — `/32` on each side would also work and is seen in some WireGuard tutorials.
- `PersistentKeepalive = 25` is only strictly necessary on the side behind NAT. Having it on both sides when neither is NATed is harmless but slightly wasteful of traffic. For router-to-router setups where both have public IPs, it can be safely dropped on one side.
- The post does not discuss iptables/nftables FORWARD chain rules. On distributions with a restrictive default FORWARD policy (e.g., some firewalld or ufw setups), users may additionally need to permit forwarding between the wg0 interface and the LAN interface. This is out of scope for a basic tutorial but is a common real-world gotcha.
- NAT (MASQUERADE) is correctly NOT configured here — site-to-site VPNs between known subnets should route, not NAT, so each side sees true source IPs. The post gets this right by omitting NAT rules.
