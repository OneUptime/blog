# Validation Summary: How to Patch Machine Network Configuration in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux machine configuration
- talosctl CLI
- Strategic merge patches and JSON Patches (RFC 6902)
- Network interfaces, routes, DNS, VLANs, bonding (802.3ad LACP), Virtual IP (VIP)
- YAML configuration

## Sources Consulted
- Talos Linux v1alpha1 configuration reference (NetworkConfig): https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos source — NetworkConfig YAML tags (`pkg/machinery/config/types/v1alpha1/v1alpha1_types.go`): https://github.com/siderolabs/talos/blob/main/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Talos source — `talosctl apply-config` flags (`cmd/talosctl/cmd/talos/apply-config.go`): https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/apply-config.go
- Talos services directory (to verify available service names for `talosctl logs`): https://github.com/siderolabs/talos/tree/main/internal/app/machined/pkg/system/services
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/

## Issues Found

1. **Incorrect DNS search domains field name.** The post used `search:` under `machine.network` in the DNS patch and complete-overhaul examples. The actual YAML field per the Talos source (`Searches` is tagged `yaml:"searchDomains,omitempty"`) is `searchDomains`. Using `search` would fail validation. Changed both occurrences to `searchDomains`.

2. **Incorrect `talosctl apply-config` patch flag.** The post used `--patch @file.yaml` in three `talosctl apply-config` invocations. The actual flag (per `apply-config.go` — `StringArrayVarP(&applyConfigCmdFlags.patches, "config-patch", "p", ...)`) is `--config-patch` (short `-p`). Note: `talosctl machineconfig patch` does use `--patch`, so that occurrence was left alone. Changed three `apply-config --patch` invocations to `--config-patch`.

3. **Nonexistent `networkd` service in `talosctl logs`.** The troubleshooting section recommended `talosctl logs networkd`. Talos does not have a `networkd` service; the services directory contains only `apid`, `auditd`, `containerd`, `cri`, `dashboard`, `etcd`, `extension`, `kubelet`, `machined`, `registryd`, `syslogd`, `trustd`, `udevd`. Network configuration is handled by controllers inside `machined`, and low-level network events surface via the kernel ring buffer. Replaced with `talosctl dmesg` and `talosctl logs machined`.

## Review Notes
- The `interface` field is still valid for naming network devices, but newer Talos releases also support `deviceSelector` for matching by hardware attributes (MAC, driver, PCI ID). The post's use of `interface` is correct but worth noting as a future enhancement.
- The `talosctl validate --mode metal` example is correct; other valid modes include `cloud` and `container`.
- The JSON Patch removal example correctly uses `op: test` before `op: remove`, which is a good safety practice to ensure the index hasn't shifted.
- The bond example uses `mode: 802.3ad` with `lacpRate: fast` and `xmitHashPolicy: layer3+4` — all are valid Linux bonding parameters that Talos passes through.
- The VIP guidance is accurate: it is intended for control plane endpoints and is held by a single node at a time via the underlying election mechanism.
