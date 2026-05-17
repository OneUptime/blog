# Validation Summary: How to Configure a Default Gateway in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1alpha1 machine configuration)
- Linux networking / routing (IPv4 and IPv6)
- DHCP
- VLANs
- Linux bonding (active-backup)
- Kubernetes networking
- talosctl CLI
- kubectl

## Sources Consulted
- Talos v1.10 v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos v1.10 CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli/
- Talos networking resources docs: https://www.talos.dev/v1.10/learn-more/networking-resources/
- siderolabs/talos issue #10983 (ping/traceroute, closed as "not planned"): https://github.com/siderolabs/talos/issues/10983

## Issues Found
- **`talosctl ping` does not exist.** The "Verifying the Default Gateway" section invoked `talosctl ping 8.8.8.8 --nodes ...` and `talosctl ping google.com --nodes ...`. There is no `ping` subcommand in talosctl (the request was filed as siderolabs/talos#10983 and closed as "not planned"). Replaced the snippet with a `kubectl run ... --image=nicolaka/netshoot -- ping ...` debug-pod pattern, which is a working way to test outbound connectivity from a Talos node's network namespace via the cluster.

All other technical content was verified as correct:
- Route fields (`network`, `gateway`, `metric`) are valid under `machine.network.interfaces[].routes[]`.
- `vlanId` is the correct field name (lowercase `d`) and the nested `addresses`/`routes` shape is valid.
- Bond config with `mode: active-backup` and a static `interfaces` list is valid syntax.
- `dhcp: true` directly on the interface is the correct top-level boolean.
- `talosctl get routes --nodes <ip>` is valid (`routes` is an alias for the route resources).
- `talosctl patch machineconfig --nodes <ip> --patch '<json>'` is the correct live-node patch syntax (distinct from `talosctl machineconfig patch`, which patches a local file).
- The `0.0.0.0/0` and `::/0` default-route semantics, metric-based failover behavior, and the note that Linux does not actively probe gateway reachability are all accurate.

## Review Notes
- The bond example uses the static `interfaces` list, which is still supported, but modern Talos also exposes `deviceSelectors` as an alternative for selecting bond members by hardware attributes. Not a correctness issue; just worth noting for future updates.
- The DHCP override example shows `dhcp: true` together with a static `routes` entry. This works, but per-protocol toggles are also available via the `dhcpOptions` block (`ipv4`/`ipv6`) if a reader needs finer control — could be a useful future addition.
- The replaced verification snippet relies on the cluster already being up and a CNI providing pod connectivity, so it is not useful for bootstrapping diagnosis. For early-bringup verification, `talosctl get routes` (already shown) and `talosctl get addresses` / `talosctl get links` are the appropriate tools.
