# Validation Summary: How to Boot Talos Linux from an ISO Image

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos Image Factory
- Bootable USB creation (dd, Rufus, balenaEtcher)
- VirtualBox / VBoxManage
- QEMU/KVM
- VMware Workstation / ESXi
- UEFI / Legacy BIOS

## Sources Consulted
- Talos Linux GitHub releases (verified asset filenames against v1.13.2): https://github.com/siderolabs/talos/releases/latest
- Talos Image Factory: https://factory.talos.dev
- Talos boot assets documentation: https://www.talos.dev/latest/talos-guides/install/boot-assets/
- Talos networking documentation: https://www.talos.dev/latest/

## Issues Found
1. **Incorrect ISO filenames from GitHub releases.** The post referenced `talos-amd64.iso` and `talos-arm64.iso`, but Talos publishes its bootable ISOs as `metal-amd64.iso` and `metal-arm64.iso`. The `talos-*` files in releases are SPDX SBOM JSON artifacts, not bootable images. Updated all references (download commands, `dd` commands on Linux/macOS, VBoxManage storageattach, and QEMU `-cdrom`) to use `metal-amd64.iso` / `metal-arm64.iso`.
2. **Incorrect Image Factory ISO type.** The post used `nocloud-amd64.iso` as the Image Factory URL example. `nocloud` is a separate cloud-init-oriented platform distributed as a raw disk image (`.raw.xz`), not a bootable ISO. For a bootable ISO from Image Factory, the correct asset is `metal-amd64.iso`. Updated the URL accordingly.
3. **Misleading IPv6 link-local claim.** The post stated that "Without DHCP, Talos will use IPv6 link-local addressing." While IPv6 link-local addresses are always present (kernel default on any up interface), Talos does not use them as a usable substitute for DHCP — they are not a discovery or configuration delivery mechanism. Reworded to clarify that without DHCP the user must configure a static address via kernel cmdline or set up DHCP.

## Review Notes
- The `VBoxManage createhd` command is technically deprecated in favor of `VBoxManage createmedium disk`, but `createhd` is still supported and works in current VirtualBox releases. Left as-is.
- The QEMU `-net nic` / `-net bridge` syntax is legacy and superseded by `-netdev` / `-device`, but it still works in current QEMU versions. Left as-is. Note that QEMU bridge networking also requires a configured `qemu-bridge-helper` and `/etc/qemu/bridge.conf` ACL — this setup detail is not covered but is outside the scope of the post.
- Image Factory version `v1.9.0` is used as a placeholder; readers should substitute the current Talos version they wish to deploy.
- The `talosctl apply-config --insecure` flag is correct for the maintenance-mode bootstrap step, since the node has no PKI yet at that point.
