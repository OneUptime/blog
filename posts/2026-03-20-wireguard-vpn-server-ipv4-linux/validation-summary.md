# Validation Summary: How to Set Up a WireGuard VPN Server with IPv4 on Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- WireGuard (VPN protocol and `wg`, `wg-quick` tooling)
- Linux kernel networking (IPv4 forwarding via sysctl)
- iptables (FORWARD and nat POSTROUTING / MASQUERADE rules)
- ufw (Uncomplicated Firewall)
- systemd (`wg-quick@wg0` service unit)
- APT / DNF package management (Ubuntu/Debian, RHEL/CentOS, EPEL)
- Curve25519 asymmetric key cryptography

## Sources Consulted
- WireGuard official site and quick-start: https://www.wireguard.com/quickstart/
- WireGuard install page: https://www.wireguard.com/install/
- `wg(8)` manual: https://man7.org/linux/man-pages/man8/wg.8.html
- `wg-quick(8)` manual (covers `[Interface]`, `Address`, `ListenPort`, `PrivateKey`, `SaveConfig`, `PostUp`, `PostDown`): https://man7.org/linux/man-pages/man8/wg-quick.8.html
- Ubuntu package documentation for `wireguard` (Ubuntu 20.04/22.04)
- Fedora/EPEL documentation for `wireguard-tools`
- Linux kernel networking docs for `net.ipv4.ip_forward`
- `iptables(8)` and `ufw(8)` manuals

## Issues Found
No technical issues found.

Specifically verified:
- `wg genkey | tee server_private.key | wg pubkey | tee server_public.key` is the canonical WireGuard key-generation pipeline (documented in the WireGuard quickstart).
- `[Interface]` keys used (`PrivateKey`, `Address`, `ListenPort`, `SaveConfig`, `PostUp`, `PostDown`) are all valid `wg-quick` configuration directives.
- `51820/udp` is the default WireGuard port.
- `iptables -A FORWARD -i wg0 -j ACCEPT` plus `iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE` is the standard NAT masquerade pattern for a WireGuard gateway.
- `net.ipv4.ip_forward=1` is the correct sysctl for enabling IPv4 forwarding.
- `systemctl enable/start wg-quick@wg0` correctly uses the templated systemd unit shipped with `wireguard-tools`.
- Curve25519 is indeed the key-exchange primitive used by WireGuard (per the Noise_IK handshake in the WireGuard protocol paper).

## Review Notes
- The iptables rules assume the external (internet-facing) interface is named `eth0`. On many modern distros the name can be `ens3`, `ens5`, `enp1s0`, etc. (predictable network interface names). Users should substitute the actual interface name from `ip route show default` — the post does not explicitly call this out, but it is a reasonable simplification for a tutorial.
- `SaveConfig = true` will cause `wg-quick` to overwrite `/etc/wireguard/wg0.conf` on interface teardown, dropping any comments in the file. This is documented behavior and not incorrect, but readers adding peers manually may want to be aware of it.
- On RHEL/CentOS Stream 8+ and modern Fedora/Rocky/Alma, `wireguard-tools` alone is sufficient because WireGuard has been in-tree since Linux 5.6. On very old kernels it would additionally require `kmod-wireguard`, but this is not relevant to the recommended modern distros.
- The post does not cover client/peer configuration, but explicitly positions that as a follow-up step, which is appropriate scope.
