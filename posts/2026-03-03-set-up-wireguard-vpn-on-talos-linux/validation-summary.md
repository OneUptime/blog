# Validation Summary: How to Set Up WireGuard VPN on Talos Linux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Talos Linux
- WireGuard
- talosctl CLI
- Kubernetes networking
- VPN routing and NAT traversal

## Sources Consulted
- Talos v1.12 WireguardConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/wireguardconfig
- Talos v1.12 Wireguard guide: https://docs.siderolabs.com/talos/v1.12/networking/advanced/wireguard
- Talos v1.12 configuration patching guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos v1.12 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1.12 static addressing and route configuration: https://docs.siderolabs.com/talos/v1.12/networking/configuration/static
- WireGuard official quick start: https://www.wireguard.com/quickstart/

## Issues Found
- The WireGuard examples used the older `machine.network.interfaces[].wireguard` shape. Current Talos documentation uses `apiVersion: v1alpha1`, `kind: WireguardConfig`, and `name` for WireGuard link configuration documents. Updated the examples to use `WireguardConfig`.
- The examples used `persistentKeepalive: 25`, but Talos documents the field as `persistentKeepaliveInterval` with Go duration syntax such as `25s`. Updated all keepalive examples and explanations.
- The address examples used scalar address entries, but current Talos logical link docs use address objects such as `- address: 10.0.0.1/24`. Updated all WireGuard address snippets.
- The route example used `network` and an empty `gateway`, but current Talos route config uses `destination`, and omitted `gateway` means a directly connected route. Updated the route snippet.
- Several endpoint examples used DNS names, but the current `WireguardConfig` reference documents endpoint as an `IP address:port` value. Replaced those examples with documentation-reserved IP addresses.
- The existing-node apply command did not show the no-reboot mode while the text claimed no reboot was required. Added `--mode no-reboot` and softened the wording to say the configuration can be applied that way.
- The verification section used `talosctl ping`, which is not in the current Talos CLI reference. Replaced it with `talosctl get routes`, alongside `talosctl get links` and `talosctl get addresses`.
- The Kubernetes CIDR example did not call out that remote pod and service CIDRs need to be non-overlapping. Clarified that the CIDRs are remote and non-overlapping.

## Review Notes
The updated YAML snippets were parsed successfully with PyYAML. `talosctl` and `wg` were not installed in the workspace, so command validation was performed against official documentation rather than local command output.
