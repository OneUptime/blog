# Validation Summary: How to Configure WireGuard Peers in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- WireGuard (key generation with `wg`, peer configuration)
- Linux networking (interfaces, addresses, allowedIPs, NAT keepalive)
- Kubernetes (Talos as a Kubernetes OS, mesh networking between nodes)

## Sources Consulted
- Talos v1alpha1 machine configuration reference (DeviceWireguardConfig / DeviceWireguardPeer schema): https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos WireGuard networking guide: https://docs.siderolabs.com/talos/v1.9/networking/wireguard-network
- Talos talosctl CLI reference (subcommand list): https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Talos `talosctl patch` source (`cmd/talosctl/cmd/talos/patch.go`) confirming `machineconfig` resource and `--patch-file` / `--patch` flags
- GitHub issue siderolabs/talos#10983 — "Add ability to PING and TRACEROUTE from Talos node" (closed as not planned), confirming `talosctl ping` does not exist
- Linux kernel WireGuard netlink specification: https://docs.kernel.org/next/netlink/specs/wireguard.html (WireGuard uses generic netlink, not `/proc/net/wireguard`)
- WireGuard cross-platform interface documentation: https://www.wireguard.com/xplatform/

## Issues Found

1. **Incorrect keepalive field name and value type.** The post used `persistentKeepalive: 25` (integer seconds). The Talos `DeviceWireguardPeer` schema names this field `persistentKeepaliveInterval` and types it as a Go `time.Duration` string (e.g., `25s`). Fixed all five occurrences across the YAML examples (node1, node2, two peers in the three-node mesh, and the subnet-routing peer) and the one prose reference in the Security Considerations section.

2. **`talosctl ping` does not exist.** The verification section instructed the reader to run `talosctl -n 192.168.1.1 ping 10.10.0.2`. There is no `ping` subcommand in talosctl; the feature was proposed in siderolabs/talos#10983 and closed as not planned. Replaced this with a `ping 10.10.0.2` run from another machine that has a route to the tunnel network, which is the realistic way to test reachability from outside an immutable Talos node.

3. **`/proc/net/wireguard` does not exist.** The post told the reader to run `talosctl -n 192.168.1.1 read /proc/net/wireguard` and inspect a handshake timestamp. The Linux WireGuard kernel module does not expose a `/proc/net/wireguard` file — configuration and status are accessed via generic netlink (the path `wg show` uses). The command would fail with a "not found" error. Replaced it with `talosctl -n 192.168.1.1 get links wg0 -o yaml`, which is a real Talos resource query that returns link details, and rewrote the surrounding sentence to talk about interface state and packet flow rather than a non-existent handshake timestamp.

## Review Notes

- The `talosctl patch machineconfig --patch-file <file>` syntax used in the post is valid; the patch command source code accepts both `--patch-file` and `--patch @file` and uses `machineconfig` as the resource type. (`mc` is the more common short form in Sidero docs but `machineconfig` works.)
- The blog post is now incorrect in describing a way to read live WireGuard peer handshake/transfer stats from inside Talos. Talos does not expose a peer-status resource for plain (non-KubeSpan) WireGuard interfaces, so connectivity testing from outside the node is genuinely the best a user can do without resorting to a debug pod that runs the `wg` userspace tool. The wording was kept neutral about this limitation rather than adding a new section.
- All other technical content — the Talos immutable-OS rationale, the `wg genkey` / `wg pubkey` key generation flow, the `mtu: 1420` choice for WireGuard, the `0.0.0.0/0` vs `/32` allowedIPs guidance, and the comment that no reboot is required for network changes — checks out against current documentation.
- The example base64 key fragments (e.g., `kF3Hs7g2LmQ9V...`) are clearly placeholders, not real WireGuard keys, and were left as-is.
