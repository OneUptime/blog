# Validation Summary: How to Configure WireGuard VPN with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- WireGuard VPN
- systemd-networkd
- systemd .netdev and .network unit files
- `wg` / `wg-tools` CLI
- Linux networking (IPv4 routing)
- Debian/Ubuntu (apt), RHEL/CentOS (yum) package management

## Sources Consulted
- systemd.netdev man page (https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html) — sections `[NetDev]`, `[WireGuard]`, `[WireGuardPeer]`
- systemd.network man page (https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html) — sections `[Match]`, `[Network]`, `[Route]`
- WireGuard official documentation (https://www.wireguard.com/quickstart/) for key generation commands (`wg genkey`, `wg pubkey`)
- systemd release notes confirming WireGuard NetDev support was added in systemd v237 (Dec 2017)
- networkctl man page for `networkctl status` verification command

## Issues Found
- **Private key file permissions**: The original `chmod 600 /etc/wireguard/wg0.key` makes the key readable only by root, but the `.netdev` file references it via `PrivateKeyFile=`, which per the systemd.netdev man page requires the file to be readable by the `systemd-network` user ("it should be, e.g., owned by root:systemd-network with mode 0640"). With 0600 root:root, systemd-networkd would fail to bring up the interface. Changed to `chmod 640` and added `chown root:systemd-network /etc/wireguard/wg0.key` to match the documented requirement. This keeps the post's later chmod/chown of the `.netdev` file consistent with the key file it references.

## Review Notes
- systemd v237 is correct as the minimum version for native WireGuard `.netdev` support. This version is very old (2017), so essentially any modern distribution ships with support.
- The `[Route]` block on the client with `Gateway=10.100.0.1` and `Destination=0.0.0.0/0` is valid systemd-networkd syntax. An alternative is to omit `Gateway=` and rely on the WireGuard peer's `AllowedIPs=0.0.0.0/0` with `RouteTable=` in `[WireGuardPeer]` to auto-populate routes, but the manual `[Route]` approach shown works correctly.
- On RHEL/CentOS, `wireguard-tools` typically requires EPEL to be enabled; the post does not mention this. Not strictly an error, but readers on RHEL-based systems may need to `dnf install epel-release` first. The `yum` command itself is still valid (aliased to `dnf` on RHEL 8+).
- `wg genkey | tee ...` briefly prints the private key to stdout before the file is secured. The standard WireGuard quickstart uses the same pattern, so this was left as-is. Using `(umask 077 && wg genkey > /etc/wireguard/wg0.key)` would be marginally safer for some future revision.
- `AllowedIPs=0.0.0.0/0` on the client means full-tunnel routing. For split-tunnel, readers would restrict this to specific subnets — the post doesn't discuss this tradeoff but it's out of scope for an introductory guide.
