# Validation Summary: How to Set Machine Network Hostname in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, COSI resources)
- talosctl CLI (gen config, apply-config, get, validate)
- Kubernetes (kubectl drain, node management)
- YAML machine configuration
- DHCP / network configuration
- Bash scripting (for fleet automation)

## Sources Consulted
- [talosctl CLI reference (v1.12)](https://docs.siderolabs.com/talos/v1.12/reference/cli) — verified flags for `apply-config` (including `--config-patch`), `gen config` (including `--config-patch-worker`, `--config-patch-control-plane`), and `validate`.
- [Talos networking resources documentation (v1.10)](https://docs.siderolabs.com/talos/v1.10/learn-more/networking-resources) — verified `HostnameSpec` / `HostnameStatus` resources, the `Status`-suffix alias (so `talosctl get hostname` and `talosctl get hostnamestatus` both work), the `network` namespace, and the configuration-layer precedence rule (configuration > operator/DHCP).
- General Kubernetes documentation for `kubectl drain` flags (`--ignore-daemonsets`, `--delete-emptydir-data`).
- RFC 1123 hostname/DNS label rules for validating the naming constraints described in the post.

## Issues Found
No technical issues found.

Specifically verified:
- `machine.network.hostname` is the correct field path.
- `talosctl apply-config --config-patch @file.yaml` is supported (the `--config-patch` flag exists on `apply-config`).
- `talosctl gen config --config-patch-worker @file.yaml` is supported.
- `talosctl get hostname` works because `HostnameStatus` exposes a `Hostname` alias (Status-suffix-removed aliases).
- `talosctl get hostnamestatus` is also valid.
- `talosctl validate --mode metal` is a valid mode (alongside `cloud` and `container`).
- The claim that static (machine-config) hostname overrides DHCP-provided hostname matches the documented merge precedence: configuration > operator.
- The DNS-label constraints (lowercase letters, digits, hyphens; max 63 chars) are correct for both Talos and the Kubernetes node-name requirements (RFC 1123).
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the current (non-deprecated) flag name.

## Review Notes
- The example output shown for `talosctl get hostname` omits the `DOMAINNAME` column that `HostnameStatus` actually emits. This is a cosmetic simplification rather than a technical error; the displayed columns and values are otherwise correct.
- The post does not pin a Talos version. The CLI surface and resource model verified above are stable on current Talos releases (v1.10–v1.12). If field/flag names change in future major releases, the post may need refreshing.
- The `interfaces` block in the DHCP example uses the legacy `interface: eth0` form. Newer Talos releases also support `deviceSelector` and the `controller`-side network configuration model, but the form shown still works on current releases.
