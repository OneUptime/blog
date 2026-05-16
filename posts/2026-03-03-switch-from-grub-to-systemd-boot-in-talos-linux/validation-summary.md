# Validation Summary: How to Switch from GRUB to systemd-boot in Talos Linux

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Talos Linux
- GRUB
- systemd-boot
- Unified Kernel Images (UKIs)
- UEFI and Secure Boot
- talosctl
- Kubernetes node drain/cordon workflows
- etcd health checks

## Sources Consulted
- Talos Boot Loader documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/
- Talos 1.10 "What's New" UEFI boot notes: https://docs.siderolabs.com/talos/v1.10/getting-started/what%27s-new-in-talos
- Talos upgrade documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Secure Boot documentation: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/bare-metal-platforms/secureboot
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli

## Issues Found
- The post claimed a normal `talosctl upgrade` migrates an existing GRUB installation to systemd-boot. Talos documentation says upgrades retain the existing boot loader, and systemd-boot/UKI applies to fresh UEFI installations starting with Talos 1.10. Updated the guide to describe a node-by-node reinstall/reprovisioning workflow instead of an upgrade workflow.
- The post said systemd-boot was available for this migration in Talos 1.4 and used `ghcr.io/siderolabs/installer:v1.9.0`. Talos 1.10 is the documented version where fresh UEFI installs default to systemd-boot/UKI, so the version guidance and example installer image were updated.
- The machine configuration used `machine.install.bootloader`, which is not a documented Talos install field. Removed it and kept documented fields such as `disk`, `image`, and `wipe`.
- The boot loader verification used filesystem paths under `/boot`. Talos documentation recommends checking `SecurityState.spec.bootedWithUKI`; the verification commands were updated to use `talosctl get securitystate -o yaml`.
- The post used `talosctl services`, but the documented command is `talosctl service`. Updated the command.
- The recovery section described A/B upgrade fallback to the previous GRUB boot path, which does not match the corrected reinstall workflow. Updated it to focus on firmware boot target checks and USB recovery.
- The Secure Boot cleanup advice implied an in-place move from GRUB to UKI/Secure Boot. Talos Secure Boot documentation says non-UKI GRUB installations cannot be upgraded directly to UKI/Secure Boot, so the note was corrected.

## Review Notes
The corrected workflow is still operationally sensitive: production users should verify backups, persistent volume behavior, node-specific machine configuration, and etcd quorum before reprovisioning control plane nodes.
