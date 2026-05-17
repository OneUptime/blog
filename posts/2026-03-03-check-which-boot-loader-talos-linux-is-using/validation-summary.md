# Validation Summary: How to Check Which Boot Loader Talos Linux Is Using

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl (CLI)
- systemd-boot
- GRUB
- UEFI / Unified Kernel Images (UKI)
- Kubernetes (kubectl helper snippet)
- Bash scripting

## Sources Consulted
- Talos Boot Loader documentation: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/bare-metal-platforms/bootloader
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.11/reference/cli
- Talos `Versions` resource source (`pkg/machinery/resources/runtime/version.go`): https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/resources/runtime/version.go
- Talos `BootedEntry` resource source (`pkg/machinery/resources/runtime/booted_entry_status.go`): https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/resources/runtime/booted_entry_status.go
- Talos runtime resource registry (`pkg/machinery/resources/runtime/runtime.go`): https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/resources/runtime/runtime.go
- Talos issue confirming `talosctl disks` was removed in favor of `talosctl get disks`: https://github.com/siderolabs/talos/issues/10001

## Issues Found
1. **Method 4 used a non-existent resource (`installedversions`).** The post originally instructed readers to run `talosctl get installedversions --nodes <NODE_IP> -o yaml`. There is no `installedversions` resource in the Talos machinery (`pkg/machinery/resources/runtime/` only defines `Versions.runtime.talos.dev`, not `InstalledVersions`), and the resource it does have only carries name/version strings — it does not surface boot loader information. I replaced the section with the documented method from Talos' own boot loader docs: `talosctl get securitystate -o yaml`, which exposes the `bootedWithUKI` field. When `bootedWithUKI: true`, the node is on systemd-boot; otherwise it is on GRUB. The section heading was updated to "Check the Security State Resource" to match the new command, but the section position and structure were preserved.
2. **Method 5 used the deprecated/removed `talosctl disks` command.** Per siderolabs/talos issue #10001, the standalone `talosctl disks` command was replaced with `talosctl get disks` (a resource-style query). I updated the command accordingly.

## Review Notes
- The EFI System Partition (ESP) path `/boot/EFI` and the GRUB BOOT-partition layout (`/boot/A/{vmlinuz,initramfs.xz}`, `/boot/B/{vmlinuz,initramfs.xz}`, `/boot/grub/grub.cfg`) match the official Talos boot loader documentation.
- `talosctl ls`, `talosctl read`, `talosctl dmesg`, and `talosctl get machineconfig` are all valid commands and used correctly.
- Worth noting for readers (not a correctness issue): starting with Talos 1.10, new UEFI installations default to systemd-boot, and GRUB on UEFI is only retained for upgraded legacy installs. GRUB on BIOS remains the only option for non-UEFI hardware.
- The `BOOT_IMAGE=` heuristic in Method 6 is genuinely a GRUB-set cmdline parameter, so that hint is accurate.
- The bash script and multi-node kubectl loop use safe shell constructs and standard `talosctl` flag forms; no issues.
