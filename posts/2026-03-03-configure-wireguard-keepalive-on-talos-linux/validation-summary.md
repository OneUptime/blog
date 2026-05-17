# Validation Summary: How to Configure WireGuard Keepalive on Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- WireGuard (protocol, persistent keepalive, transport data messages, Noise IKpsk2 handshake)
- NAT / stateful firewall traversal
- UDP networking

## Sources Consulted
- Talos v1alpha1 machine configuration reference, `DeviceWireguardPeer` schema — https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos CLI reference (`talosctl`) — https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos configuration patches guide — https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/patching
- WireGuard protocol & cryptography page — https://www.wireguard.com/protocol/
- WireGuard whitepaper (PDF) — https://www.wireguard.com/papers/wireguard.pdf
- Linux kernel WireGuard netlink spec — https://docs.kernel.org/next/netlink/specs/wireguard.html
- WireGuard kernel `netlink.c` source — https://git.zx2c4.com/wireguard-linux/tree/drivers/net/wireguard/netlink.c
- `golang.zx2c4.com/wireguard/device` constants (RekeyAfterTime = 120s)
- Pro Custodibus: "Troubleshooting WireGuard with Tcpdump" (keepalive = 32-byte UDP payload)
- siderolabs/talos issue #10983 (`talosctl ping` is an open feature request, not an implemented command)

## Issues Found

1. **Wrong Talos field name (`persistentKeepalive` → `persistentKeepaliveInterval`)**. The Talos `DeviceWireguardPeer` schema uses `persistentKeepaliveInterval`, and the value is a Go `Duration` (e.g. `25s`), not a bare integer. Replaced every occurrence in the YAML samples and in prose, and noted the duration format in the "Configuring" section. Updated the "disabled" example to `0s` and to mention that omitting the field is equivalent.

2. **Wrong `talosctl patch` flag (`--patch-file` → `--patch @file.yaml`)**. The actual flag is `--patch`, and the `@` prefix tells talosctl to read from a file. Updated the patch-apply example.

3. **`/proc/net/wireguard` does not exist**. WireGuard uses generic netlink, not a procfs file; there is no such path to read on a Talos node (or any Linux host). Rewrote the "Monitoring Keepalive Status" section to use `talosctl get links wg0` and to point at `wg show` on a peer that has the userspace tool, rather than a non-existent file.

4. **Keepalive does not update the "latest handshake" timestamp**. Keepalives are transport data packets (message type 4) with an empty payload, while "latest handshake" is updated by the Noise IKpsk2 handshake (renegotiated roughly every 120 s while traffic flows). The original advice — that a handshake timestamp within the keepalive interval means keepalive is working — was incorrect. Rewrote the section to explain the distinction and to suggest watching the link/traffic instead.

5. **`talosctl ping` is not a real subcommand** (it is an open feature request: siderolabs/talos#10983). Removed the `talosctl ... ping peer.example.com` example in the troubleshooting section and replaced it with `talosctl get links wg0 -o yaml`, which actually exists and is useful for confirming the resolved endpoint and link state.

6. **Keepalive packet size was overstated (~128 bytes → ~60 bytes IPv4)**. A WireGuard keepalive carries no payload: 16-byte WireGuard header + 16-byte Poly1305 tag = 32-byte UDP payload, plus 8-byte UDP header + 20-byte IPv4 header = 60 bytes on the wire (80 over IPv6). Corrected the figure and recomputed the per-peer and per-node bandwidth numbers (~2.4 B/s per peer, ~78 KB/hour per node in a 10-node mesh).

## Review Notes

- The recommended 25 s default and the general guidance on NAT/UDP timeouts (30–120 s typical, lower on cellular/cheap CPE) match the WireGuard project's standard advice and are appropriate.
- The post references `talosctl get links` (a real subcommand backed by COSI resources). For user-configured WireGuard interfaces, Talos does not currently expose a per-peer status resource analogous to KubeSpan's `kubespanpeerstatus`; the only way to get per-peer byte counters or a fresh handshake timestamp is to run `wg show` from a peer that has the userspace tool. The revised monitoring section now reflects this.
- The Talos `DeviceWireguardPeer` schema also accepts `allowedIPs` and `endpoint` exactly as used in the post; no changes needed there.
- The `talosctl patch mc --patch @file.yaml` form patches a running node; for an offline file edit the form is `talosctl machineconfig patch <file> --patch @file.yaml -o out.yaml`. The post's use case (live node) is correctly served by the form now shown.
