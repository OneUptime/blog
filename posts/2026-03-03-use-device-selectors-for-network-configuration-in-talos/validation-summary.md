# Validation Summary: How to Use Device Selectors for Network Configuration in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos network device selectors
- Talos interface bonding
- `talosctl`
- YAML configuration

## Sources Consulted
- Talos Network Device Selector documentation: https://docs.siderolabs.com/talos/v1.10/networking/device-selector
- Talos MachineConfig reference for `NetworkDeviceSelector`, `Device`, `Bond`, routes, and DHCP options: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos `talosctl get` CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Predictable Interface Names documentation: https://www.talos.dev/v1.9/talos-guides/network/predictable-interface-names/

## Issues Found
- The post described `hardwareAddr` as the bond selector to use for bond members. Current Talos documentation recommends `permanentAddr` for bond members because `hardwareAddr` can change when a link is enslaved to a bond. Updated the bonding example and explanatory text to use `permanentAddr`.
- The selector criteria section omitted current supported qualifiers `permanentAddr` and `pciID`. Added short sections for both so the "available selector criteria" list reflects current Talos documentation.
- The post said a regular `deviceSelector` should match exactly one interface and that Talos uses the first match if it matches multiple interfaces. Current Talos documentation says the controller applies the configuration to all matching devices. Updated the matching rule accordingly.
- The post called a no-match condition an error while also saying configuration is skipped. Updated the wording to state that no configuration is applied when no interface matches.
- The description and conclusion implied selectors generally survive hardware replacement. This is only true for selector choices such as bus path, not MAC-based targeting of a specific NIC. Updated the wording to distinguish slot-based replacement from targeting a specific NIC.
- The interface-property discovery text did not mention permanent hardware addresses or PCI IDs. Updated it to match current `LinkStatus` fields shown in Talos documentation.

## Review Notes
- The remaining YAML examples use current Talos machine configuration fields such as `machine.network.interfaces`, `deviceSelector`, `addresses`, `routes`, `dhcp`, `dhcpOptions.routeMetric`, and `bond.deviceSelectors`.
- The `talosctl get links --nodes ...`, `talosctl get links --nodes ... -o yaml`, `--insecure`, and `--config-patch @file` command forms are consistent with the current Talos CLI reference.
