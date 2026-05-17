# Validation Summary: How to Configure WireGuard for Pod-to-Pod Traffic on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machineconfig, talosctl, COSI link resources)
- WireGuard (kernel module, key generation, peer mesh, MTU)
- Kubernetes (CNI plugins, pod networking)
- Cilium (built-in WireGuard encryption, `cilium-dbg` CLI)
- Flannel (`public-ip-overwrite` annotation)

## Sources Consulted
- Cilium WireGuard transparent encryption docs: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium `cilium-dbg` cmdref: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Talos v1alpha1 config reference (DeviceWireguardConfig / DeviceWireguardPeer): https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos configuration patches guide: https://www.talos.dev/v1.6/talos-guides/configuration/patching/
- Talos networking resources (links, addresses): https://www.talos.dev/v1.11/learn-more/networking-resources/
- Flannel `public-ip-overwrite` annotation PR: https://github.com/coreos/flannel/pull/840
- Linux kernel netlink spec for WireGuard: https://docs.kernel.org/next/netlink/specs/wireguard.html
- WireGuard MTU tuning reference: https://www.procustodibus.com/blog/2022/12/wireguard-performance-tuning/

## Issues Found
1. **`cilium encrypt status` command** — In Cilium 1.14+ the in-agent CLI was renamed to `cilium-dbg`. Updated both invocations in the "Verifying Cilium WireGuard Encryption" section to use `cilium-dbg encrypt status` (and `--verbose`).
2. **`persistentKeepalive` field name** — Talos's `DeviceWireguardPeer` schema names this field `persistentKeepaliveInterval` and expects a Go duration string, not a bare integer. Updated all four peer entries from `persistentKeepalive: 25` to `persistentKeepaliveInterval: 25s`.
3. **`talosctl patch machineconfig --patch-file`** — talosctl uses `--patch @file.yaml` (the `@` prefix tells the flag to read from a file); there is no `--patch-file` flag. Updated all five `talosctl patch machineconfig` invocations.
4. **`talosctl read /proc/net/wireguard`** — `/proc/net/wireguard` does not exist. WireGuard exposes its state via generic netlink (queried by the `wg` userspace tool), not procfs. Replaced this call with `talosctl get links wg0 -o yaml`, which surfaces the COSI `LinkStatus` resource Talos populates for the wg interface, and added a brief note explaining the change.
5. **MTU justification** — The post stated WireGuard overhead is "typically 60 bytes" but then derived an MTU of 1420 (which assumes 80 bytes). 60 bytes is correct for IPv4 transport (yielding 1440), while 80 bytes applies when the underlay is IPv6. Reworded the paragraph to give both numbers and frame 1420 as a safe default that works for either transport.

## Review Notes
- Cilium Helm value paths (`encryption.enabled`, `encryption.type`, `encryption.wireguard.userspaceFallback`) are all correct as written.
- The Flannel annotation `flannel.alpha.coreos.com/public-ip-overwrite` is correct (it is the user-settable override; the un-suffixed `public-ip` annotation is what flannel itself populates).
- The Talos WireGuard YAML field names `privateKey`, `listenPort`, `peers`, `publicKey`, `endpoint`, and `allowedIPs` all match the v1alpha1 schema.
- `talosctl get links` is a valid alias for the `LinkStatuses.net.talos.dev` COSI resource.
- The example pod CIDR layout (one /24 per node out of 10.244.0.0/16) matches the Flannel/Kubeadm defaults and is consistent with the rest of the post.
- Future maintenance: if Cilium drops the `cilium` → `cilium-dbg` shim entirely, the `cilium-dbg` commands shown here are already the canonical form. The `persistentKeepaliveInterval` duration syntax has been stable across Talos v1.x.
