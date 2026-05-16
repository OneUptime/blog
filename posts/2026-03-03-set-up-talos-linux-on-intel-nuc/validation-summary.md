# Validation Summary: How to Set Up Talos Linux on Intel NUC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- `talosctl`
- Kubernetes
- Intel NUC bare-metal installation
- Talos machine configuration YAML
- Linux and macOS USB boot media creation

## Sources Consulted
- Talos Linux v1.9 Getting Started: https://docs.siderolabs.com/talos/v1.9/getting-started/getting-started
- Talos Linux `talosctl` installation docs: https://www.talos.dev/latest/talos-guides/install/talosctl/
- Talos Linux v1.9 MachineConfig reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config
- Talos Linux v1.9 configuration patching docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Talos Linux v1.9.0 release notes: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Local verification with `talosctl v1.9.0 --help`, `talosctl version --client`, and `talosctl gen config`

## Issues Found
- The original `talosctl` install command used `curl -sL https://talos.dev/install | sh`, which installs the latest `talosctl`, while the rest of the post explicitly used Talos `v1.9.0` ISO and installer images. Talos documentation recommends matching the `talosctl` version to the Talos version being installed, so the command was changed to download `talosctl` from the `v1.9.0` GitHub release.
- The HA VIP example used an RFC6902 patch against `/machine/network/interfaces/0/vip`, which only works if a first interface already exists in the generated config. The example was changed to a control-plane strategic merge patch that explicitly configures `eno1` with DHCP and the VIP.
- The troubleshooting section recommended `talosctl disks`, but Talos `v1.9.0` release notes state that this command was removed. It was changed to `talosctl get disks --insecure --nodes <NUC_IP>`.

## Review Notes
The tutorial remains version-specific to Talos `v1.9.0`. Current Talos stable releases are newer, so a future refresh could update the post to the latest supported Talos release and the newer networking configuration model.
