# Validation Summary: How to Rotate WireGuard Keys on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl`)
- WireGuard (key generation, mesh topology, pre-shared keys, perfect forward secrecy)
- `wireguard-tools` (`wg genkey`, `wg pubkey`, `wg genpsk`, `wg show`)
- Bash scripting
- GitHub Actions (scheduled workflows)
- HashiCorp Vault (secret storage)
- Kubernetes (`kubectl debug`, `kubectl run`, `hostNetwork` pods)
- `shred` for secure file deletion

## Sources Consulted
- Talos v1.7 configuration reference — `DeviceWireguardConfig` / `DeviceWireguardPeer` schema: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Talos v1alpha1 types source: https://github.com/siderolabs/talos/blob/v1.7.0/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Talos `talosctl` CLI reference: https://www.talos.dev/v1.7/reference/cli/
- Talos WireGuard networking guide: https://www.talos.dev/v1.7/talos-guides/network/wireguard-network/
- `wg(8)` manpage: https://manpages.debian.org/unstable/wireguard-tools/wg.8.en.html
- Linux kernel WireGuard netlink spec: https://docs.kernel.org/next/netlink/specs/wireguard.html
- siderolabs/talos issue #10983 (request for `talosctl ping`): https://github.com/siderolabs/talos/issues/10983
- crontab.guru for cron expression `0 2 1 */3 *`

## Issues Found

1. **Wrong YAML field name `persistentKeepalive`** — Talos's `DeviceWireguardPeer` schema uses `persistentKeepaliveInterval` and the value is a Go duration string (e.g. `25s`), not a bare integer. Fixed by renaming every occurrence in the YAML examples and changing `25` to `25s`.

2. **`presharedKey` is not exposed in Talos's machine config** — The blog's PSK section claimed `presharedKey` could be added to a peer entry in the Talos machine config. Verified against both the v1.7 config reference docs and the upstream `v1alpha1_types.go`: `DeviceWireguardPeer` only contains `PublicKey`, `Endpoint`, `WireguardPersistentKeepaliveInterval`, and `WireguardAllowedIPs`. Rewrote the PSK section to explain this limitation and direct readers to run WireGuard outside Talos's native interface (e.g. in a privileged `hostNetwork` pod) if they need PSKs. Removed the misleading YAML example.

3. **`talosctl ping` does not exist** — There is no `ping` subcommand in `talosctl` (it's an open feature request, siderolabs/talos #10983, May 2025). Talos has no shell or traditional networking utilities. Replaced both uses (verification step and rotation script) with `talosctl get links wg0` / `talosctl get addresses`, and added a `kubectl run`/`kubectl debug` example with `hostNetwork: true` for L3 connectivity testing.

4. **`talosctl read /proc/net/wireguard` does not work** — WireGuard exposes its state over generic netlink (genetlink family `wireguard`), not procfs; `/proc/net/wireguard` does not exist on any standard Linux distribution. The Sidero docs recommend running `wg show` from a `hostNetwork: true` pod. Replaced the procfs reads with `talosctl get links wg0` plus a `kubectl debug` example that runs `wg show` in a debug pod.

5. **Planning section's step order contradicted the actual procedure** — The numbered list in "Planning the Rotation" had "update the node's own configuration" as step 2 and "update all peers" as step 3, but the rest of the post (correctly) tells you to update peers first to minimize disruption. Swapped the two list items so the planning summary matches the step-by-step.

## Review Notes

- The `wg genkey`, `wg pubkey`, and `wg genpsk` commands are correct per `wg(8)`.
- The `talosctl patch machineconfig --patch-file <file>` syntax is valid; `talosctl patch mc -p @<file>` is the shorter equivalent.
- The GitHub Actions cron expression `'0 2 1 */3 *'` correctly fires at 02:00 on the 1st day of every 3rd month (Jan 1, Apr 1, Jul 1, Oct 1).
- WireGuard's perfect-forward-secrecy claim is accurate: ephemeral session keys are derived per handshake via Noise IK; the static keys are used for peer identity / authentication, so rotating them is a meaningful defense-in-depth measure even though session traffic is already FS-protected.
- Schema field name validation was done against Talos v1.7. Older versions used the same `persistentKeepaliveInterval` naming, but if the blog is later refreshed for v1.8+ the schema should be re-checked.
- The `ghcr.io/wireguard/wireguard-go:latest` image used in the `kubectl debug` example is illustrative; in production, pin a digest and use an image that includes `wg` (wireguard-tools), since `wireguard-go` itself is the userspace implementation rather than the CLI. A `nicolaka/netshoot` image is a common practical alternative.
- The `shred` command is generally ineffective on modern copy-on-write or flash storage (ext4 with journaling, SSDs with wear-leveling, btrfs/zfs). For real assurance, encrypt at rest and rotate the encryption key, or destroy the underlying media. This is outside the scope of the post but worth noting if the section is ever expanded.
