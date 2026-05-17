# Validation Summary: How to Configure VLANs on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1alpha1 machine configuration)
- VLAN (IEEE 802.1Q)
- Linux bonding (802.3ad / LACP, active-backup)
- talosctl CLI (`gen config`, `apply-config`, `get links`, `get addresses`, `get routes`)
- DHCP on VLAN interfaces
- Kubernetes networking (general)

## Sources Consulted
- Talos Linux v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos config patching docs: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/patching
- Talos networking resources docs (for `talosctl get links/addresses/routes` resource names)
- Linux kernel bonding documentation (modes, xmit_hash_policy, lacp_rate)
- IEEE 802.1Q (4-byte VLAN tag overhead)

## Issues Found
No technical issues found.

Verified items:
- `machine.network.interfaces[]` schema: `interface`, `addresses`, `routes`, `vlans`, `bond`, `mtu`, `dhcp`, `nameservers` are valid fields.
- `vlans[]` schema: `vlanId`, `addresses`, `routes`, `mtu`, `dhcp`, `dhcpOptions` are valid.
- `dhcpOptions.routeMetric` is a valid field.
- `bond` schema: `mode`, `lacpRate`, `xmitHashPolicy`, `interfaces` are valid. Bond `mode: 802.3ad` and `mode: active-backup` are valid mode strings. `lacpRate: fast` and `xmitHashPolicy: layer3+4` are valid values.
- VLAN ID range (1–4094) and 4-byte 802.1Q tag overhead are correct.
- `eth0.100` / `bond0.10` virtual interface naming is consistent with Linux convention.
- `talosctl gen config <name> <endpoint> --config-patch @file.yaml` and `talosctl apply-config --nodes <ip> --file <file> --config-patch @file.yaml` flag usage is correct.
- `talosctl get links`, `talosctl get addresses`, `talosctl get routes` are valid resource queries.

## Review Notes
- The post uses the deprecated-but-still-supported `interface:` field for device selection. Newer Talos configs may prefer `deviceSelector:` for more robust device identification, but `interface:` remains valid and widely used.
- The `--config-patch @file.yaml` form treats the YAML as a strategic merge patch when the file is a YAML object (not a JSON Patch array). The examples in the post are partial machine configs, which is the correct shape for a strategic merge patch.
- Bond mode `802.3ad` requires switch-side LACP configuration; the post correctly notes this in the Switch Configuration section.
- The MTU caveat for jumbo frames (all devices on the L2 segment must agree) is correctly noted.
