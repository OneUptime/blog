# Validation Summary: How to Set Up a Network Bridge in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config v1alpha1)
- `talosctl` CLI (`gen config`, `apply-config`, `get links/addresses/routes`)
- Linux network bridges (Layer 2)
- Spanning Tree Protocol (STP)
- Linux bonding (active-backup mode)
- 802.1Q VLANs
- DHCP
- KubeVirt (mentioned for VM use case)

## Sources Consulted
- Talos v1.11 machine config reference (BridgeConfig / Device schema): https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config/
- Talos v1.11 `talosctl` CLI reference (`gen config`, `apply-config`): https://docs.siderolabs.com/talos/v1.11/reference/cli/
- Linux kernel bonding documentation (referenced from Talos docs for valid `mode` values)

## Issues Found
No technical issues found.

Verified specifics:
- `bridge.interfaces` (array of strings) and `bridge.stp.enabled` (bool) field names and types match the v1alpha1 schema.
- Device-level fields used alongside `bridge` (`addresses`, `routes`, `mtu`, `dhcp`, `vlans`) are all valid per the Device schema.
- `vlans[].vlanId` (camelCase, uint16) matches the official field name.
- `bond.mode: active-backup` is a valid Linux kernel bonding mode (the `mode` field is a string passed through to the kernel).
- `talosctl gen config <cluster> <endpoint> --config-patch @file.yaml` matches the documented flag (`--config-patch stringArray`, `@file` reads from a file).
- `talosctl apply-config --nodes <ip> --file <file> --config-patch @file.yaml` matches the documented flags (`-f/--file`, `-p/--config-patch`).
- `talosctl get links | addresses | routes --nodes <ip>` are valid COSI resource queries.
- The ~30 second STP forwarding delay claim is consistent with default STP timers (15s listening + 15s learning).
- Layer 2 framing/broadcast/ARP description in the Security section is accurate.

## Review Notes
- The post does not pin a Talos version. The schema and CLI flags shown are valid as of Talos v1.11 (current at time of review); the bridge configuration shape has been stable across recent minor releases, so this is unlikely to become misleading soon, but a future version note would help readers.
- The `vlans` block under a bridge interface attaches VLAN sub-interfaces to the bridge device (i.e. `br0.100`, `br0.200`). This works but is a slightly unusual pattern — bridge VLAN filtering (`bridge.vlan.vlanFiltering`) is the more modern approach for VLAN-aware bridges. The post briefly acknowledges that "bridging VLAN interfaces themselves" is more advanced, which is reasonable scope-management for an introductory guide.
- The MTU guidance ("All member interfaces should have the same or higher MTU") is correct; in practice, operators usually set them equal to avoid surprises.
- No URLs in the post body to verify beyond the author's GitHub profile.
