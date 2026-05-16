# Validation Summary: How to Troubleshoot WireGuard Connectivity on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- WireGuard
- talosctl
- Linux networking
- UDP firewalls and NAT traversal
- MTU troubleshooting

## Sources Consulted
- Talos Linux v1.13 WireguardConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/wireguardconfig
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux networking resources documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/networking-resources
- Talos Linux WireGuard network guide: https://docs.siderolabs.com/talos/v1.12/networking/wireguard-network/
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- WireGuard cross-platform interface documentation: https://www.wireguard.com/xplatform/
- WireGuard protocol documentation: https://www.wireguard.com/protocol/

## Issues Found
- The post used `talosctl ping`, including `talosctl ping -s`, but `ping` is not a documented `talosctl` command. Replaced those examples with standard Linux `ping` commands run from a machine or hostNetwork pod on the relevant network path.
- The keepalive example used `persistentKeepalive: 25`, which is not the Talos WireGuard configuration field. Updated it to `persistentKeepaliveInterval: 25s`, matching the Talos duration field.
- The WireGuard YAML examples used the older nested `machine.network.interfaces` shape. Updated the keepalive and MTU examples to current `WireguardConfig` documents.
- The post described a recent `latest handshake` as meaning the tunnel is working. Narrowed this to say the peers completed a handshake recently, because a successful handshake does not guarantee traffic or routing are correct.
- The UDP `nc -zuv` example implied a definitive connectivity test. Added a note that UDP checks are limited and WireGuard silently drops unauthenticated packets.
- The machine configuration inspection commands used `talosctl get machineconfig` in a way that may miss multi-document network configuration. Updated them to read `/system/state/config.yaml` when grepping for WireGuard configuration.

## Review Notes
The remaining troubleshooting flow is technically sound. In a future revision, the post could mention KubeSpan separately from manually configured WireGuard, because KubeSpan also uses WireGuard but has its own Talos configuration and diagnostics.
