# Validation Summary: How to Configure WireGuard VPN with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- WireGuard VPN
- Netplan (YAML network configuration)
- systemd-networkd
- Ubuntu Linux
- sysctl / IP forwarding
- iproute2 (`ip link`, `ip addr`)

## Sources Consulted
- Netplan official WireGuard example: https://github.com/canonical/netplan/blob/main/examples/wireguard.yaml
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- Ubuntu `wireguard-tools` / `wg(8)` documentation

## Issues Found
No technical issues found.

Verified the Netplan YAML schema against the official Canonical example:
- `mode: wireguard` — correct tunnel mode value.
- `port:` — correct field for the UDP listening port.
- `key:` — correctly accepts an absolute path to a private key file or a base64 string.
- `addresses:` — correct sequence format with CIDR notation.
- `peers:` — correct list with nested `keys.public`, `allowed-ips`, `endpoint`, and `keepalive` fields (all confirmed against the Netplan reference).
- `routes:` with `to:` / `via:` — correct syntax.
- Key-generation commands (`wg genkey`, `wg pubkey`) and permissions (`chmod 600`) match the WireGuard Quick Start guide.
- `net.ipv4.ip_forward=1` and the `sysctl.conf` / `sysctl -p` workflow are correct.

## Review Notes
- Netplan's WireGuard tunnel support requires the `networkd` renderer. The post lists `systemd-networkd` as a prerequisite, which is correct, but the YAML does not explicitly set `renderer: networkd`. On Ubuntu Server this is the default, but on Ubuntu Desktop (where NetworkManager is default), readers may need to add `renderer: networkd` under the `network:` block.
- WireGuard tunnel support in Netplan was introduced in Netplan 0.100 (late 2020). The "Ubuntu 20.04 or later" prerequisite is accurate because Ubuntu 20.04 LTS received Netplan updates that include WireGuard support via SRU, though very early 20.04 point releases shipped with Netplan 0.99.
- The `sudo cat private.key | wg pubkey | sudo tee public.key` pipeline works correctly: `sudo cat` is required because the private key is `chmod 600` root-owned, while `wg pubkey` is a stateless transform that does not require root. No change needed.
- The client configuration uses `addresses: - 10.100.0.2/24`, which treats the entire tunnel subnet as directly connected on `wg0`. This is a common and valid pattern; using `/32` on the client would also be acceptable but requires explicit routes. No change needed.
- For a production full-tunnel VPN, readers will also need NAT/masquerading (`iptables -t nat -A POSTROUTING ...`) on the server. This is outside the scope of a Netplan-focused tutorial and is not a technical error.
