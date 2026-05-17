# Validation Summary: How to Configure Static IP Addresses in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes networking (control plane / worker nodes)
- IPv4 and IPv6 addressing / dual-stack
- Static routes and default gateways
- Device selectors (busPath, hardwareAddr, driver, physical)
- YAML machine configuration and config patches (strategic merge / JSON patch)

## Sources Consulted
- [Talos v1.8 Configuration Reference (v1alpha1)](https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/) — confirmed `machine.network.interfaces` fields (`interface`, `addresses`, `routes`, `mtu`, `deviceSelector` with `busPath`, `hardwareAddr`, `driver`, `physical`)
- [Talos v1.8 talosctl CLI Reference](https://docs.siderolabs.com/talos/v1.8/reference/cli/) — confirmed the set of available top-level commands (no `ping` subcommand)
- [Sidero Docs: Editing Machine Configuration](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration) — confirmed `talosctl patch machineconfig` usage
- [Sidero Docs: Configuration Patches](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching) — confirmed `--config-patch` flag, inline JSON and `@file` patch syntax
- [Sidero Docs: Networking Resources](https://www.talos.dev/v1.10/learn-more/networking-resources/) — confirmed `talosctl get links`, `get addresses`, `get routes`, `get resolvers` resource names
- [GitHub Issue siderolabs/talos#10983: Add ability to PING and TRACEROUTE from Talos node](https://github.com/siderolabs/talos/issues/10983) — confirmed that `talosctl ping` is an open feature request and not an existing command

## Issues Found
- **Invalid command `talosctl ping`** — The "Verifying the Configuration" section originally suggested `talosctl ping 8.8.8.8 --nodes 192.168.1.10`. There is no built-in `ping` subcommand in talosctl (it is a long-standing feature request — see siderolabs/talos#10983). Replaced it with `talosctl get links --nodes 192.168.1.10`, which is a valid command and complements the existing verification steps by surfacing link state and MAC info.

## Review Notes
- All YAML machine config snippets (`machine.network.interfaces` with `addresses`, `routes`, `nameservers`, `deviceSelector` fields) match the v1alpha1 schema and are correctly written.
- The `talosctl apply-config --insecure --nodes ... --file ... --config-patch @file.yaml` usage is correct; strategic merge YAML patches are auto-detected.
- The inline JSON `--config-patch` and `--patch` examples are valid strategic merge patches; the patch shape (`machine.network.interfaces[].interface` as the merge key) matches Talos's documented merge strategy.
- Device selector fields used (`busPath`, `hardwareAddr`, `driver`, `physical`) all exist; the schema also exposes `pciID`, which the post does not mention — not an error, just a non-exhaustive list, which is acceptable for a tutorial.
- The networking advice (only one default route, gateway must be on-subnet, DNS required for image pulls/NTP, CIDR notation required) is technically sound.
- Version note: the post does not pin to a specific Talos version. The verified syntax matches Talos v1.8 / v1.9; readers on much older or newer versions should still cross-check against the matching docs.
