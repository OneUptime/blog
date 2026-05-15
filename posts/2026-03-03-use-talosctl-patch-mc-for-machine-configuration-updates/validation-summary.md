# Validation Summary: How to Use talosctl patch mc for Machine Configuration Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes machine configuration
- Strategic merge patches
- JSON Patch (RFC 6902)
- YAML configuration

## Sources Consulted
- Talos Linux v1.12 Configuration Patches: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux v1.12 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux v1.12 MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux v1.12 Hostname configuration: https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- Talos Linux v1.12 ResolverConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/resolverconfig
- Talos Linux v1.12 TimeSyncConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/timesyncconfig
- Talos Linux v1.12 release notes for network configuration changes: https://docs.siderolabs.com/talos/v1.12/getting-started/what%27s-new-in-talos
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902
- MetalLB native manifest URL: https://raw.githubusercontent.com/metallb/metallb/main/config/manifests/metallb-native.yaml

## Issues Found
- The post stated that `talosctl` supports strategic merge patches in YAML format, but the official Talos patching documentation says patch format is auto-detected as either JSON Patch or strategic merge patch. Updated the wording to include both formats.
- Hostname examples used the legacy `machine.network.hostname` field. Talos v1.12 replaces this with `HostnameConfig` and keeps the old `machine.network` fields only for backward compatibility. Updated hostname patch examples to use `apiVersion: v1alpha1`, `kind: HostnameConfig`, `hostname`, and `auto: off`.
- DNS examples used the legacy `machine.network.nameservers` field. Talos v1.12 replaces this with `ResolverConfig`. Updated the DNS example to use `kind: ResolverConfig` and `nameservers[].address`.
- NTP examples used the legacy `machine.time.servers` structure. Current Talos documentation uses `TimeSyncConfig` with `ntp.servers`. Updated the NTP patch example accordingly.
- The dry-run section said it shows the resulting configuration and whether a reboot would be required. The current CLI reference describes `--dry-run` for `talosctl patch` as printing a change summary and patch preview without applying changes. Updated the wording to match the CLI reference.
- JSON Patch examples targeted deprecated network paths. Updated them to use current `machine.nodeLabels` and `machine.kubelet.extraArgs` paths from the MachineConfig reference.

## Review Notes
The remaining command forms, including `talosctl patch mc`, `--nodes`, repeated `--patch` flags, `--dry-run`, and apply modes `auto`, `no-reboot`, `staged`, and `reboot`, match the current Talos CLI reference. The CLI also supports `try` mode, but the post is not incorrect for omitting it.
