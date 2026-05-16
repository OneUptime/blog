# Validation Summary: How to Use Staged Mode for Configuration Changes in Talos Linux

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos machine configuration and patches
- Kubernetes cluster maintenance
- GitHub Actions
- Bash

## Sources Consulted
- Talos v1.12 Edit Machine Configuration documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos v1.12 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1.12 Configuration Patches documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos v1.12 MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos v1.12 etcd maintenance documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance

## Issues Found
- The post used `talosctl apply-config --patch ...` for live node patching. Current Talos CLI documentation exposes patch-file support for `talosctl patch machineconfig --patch` and uses `apply-config` for full machine configuration files, with `--config-patch` only applying patches to a local config file before submission. Updated patch-based examples to use `talosctl patch machineconfig --patch ...`.
- The post implied `talosctl get machineconfig` could show the staged configuration before reboot. Talos documents that `--mode=staged` does not modify the current node configuration, so `get machineconfig` continues to show the running configuration. Updated the section to explain this and show a local comparison using `talosctl get machineconfig v1alpha1 -o jsonpath='{.spec}'` plus `talosctl machineconfig patch`.
- The cancellation section said the current configuration could be reapplied with either `--mode staged` or `--mode no-reboot`. Since the goal is to overwrite the staged reboot-time configuration, narrowed the guidance to `--mode staged`.
- The upgrade section suggested staging a Talos version upgrade by patching `machine.install.image` and rebooting. Talos provides `talosctl upgrade --stage --image ...` for staged upgrades, while `.machine.install` is only applied during install/upgrade. Updated the upgrade example to use `talosctl upgrade --stage`.

## Review Notes
- I could not verify commands against a locally installed `talosctl` because it is not installed in this workspace. Commands and flags were checked against the official Sidero/Talos documentation instead.
- The example installer image version is illustrative. Operators should use the target Talos version that matches their planned upgrade.
