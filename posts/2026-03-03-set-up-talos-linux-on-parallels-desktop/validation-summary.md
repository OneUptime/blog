# Validation Summary: How to Set Up Talos Linux on Parallels Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Parallels Desktop for macOS
- Kubernetes
- talosctl
- kubectl
- Homebrew
- macOS virtualization and networking

## Sources Consulted
- Talos Linux talosctl installation documentation: https://docs.siderolabs.com/talos/v1.12/getting-started/talosctl
- Talos Linux KVM virtualized platform guide: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/virtualized-platforms/kvm
- Talos Linux OpenNebula virtualized platform guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/virtualized-platforms/opennebula
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Parallels Desktop CLI overview: https://docs.parallels.com/parallels-desktop-developers-guide/command-line-interface-utility
- Parallels Desktop create VM CLI documentation: https://docs.parallels.com/parallels-desktop-developers-guide/command-line-interface-utility/manage-virtual-machines-from-cli/general-virtual-machine-management/create-a-virtual-machine
- Parallels Desktop CPU and memory CLI documentation: https://docs.parallels.com/parallels-desktop-developers-guide/command-line-interface-utility/manage-virtual-machines-from-cli/virtual-machine-configuration-tasks/cpu-and-memory-parameters
- Parallels Desktop boot order CLI documentation: https://docs.parallels.com/parallels-desktop-developers-guide/command-line-interface-utility/manage-virtual-machines-from-cli/virtual-machine-configuration-tasks/boot-order-parameters
- Parallels Desktop virtual optical drive CLI documentation: https://docs.parallels.com/parallels-desktop-developers-guide/command-line-interface-utility/manage-virtual-machines-from-cli/virtual-machine-configuration-tasks/device-management/virtual-optical-drive
- Parallels Desktop virtual network adapter CLI documentation: https://docs.parallels.com/parallels-desktop-developers-guide/command-line-interface-utility/manage-virtual-machines-from-cli/virtual-machine-configuration-tasks/device-management/virtual-network-adapter

## Issues Found
- The prerequisites described only Pro or Business edition for CLI features. Parallels documentation describes CLI support for Pro and Business/Enterprise editions, so the wording was updated.
- The VM creation comment said the VM was created from the Talos ISO, but the command creates a VM first and attaches the ISO afterward. The comment was corrected.
- The Parallels optical drive commands attached an ISO but did not explicitly connect it. Parallels documentation supports connecting optical media, and its CLI examples use `--connect`, so the ISO attachment commands now include `--connect`.
- The worker VM and automation script did not set the boot order. The control plane example already did this, and Parallels boot order documentation requires named devices, so the worker and script examples now set `cdrom0` before `hdd0`.
- The Talos configuration flow did not mention checking the install disk if Parallels exposes a disk name other than the default. Talos virtualized platform documentation uses `talosctl get disks --insecure` and `--install-disk`, so a short corrective note and commands were added.
- The `talosctl config merge talosconfig` command came after endpoint and node configuration. The generated client config needs to be available before changing that context, so the merge command was moved before `talosctl config endpoint` and `talosctl config node`.
- The troubleshooting section referred to ARM64 on Apple Silicon taking longer because of an emulation layer. ARM64 guests on Apple Silicon are not an x86 emulation case, so the wording was corrected to a generic initialization delay.

## Review Notes
The Parallels distribution value `linux-2.6` is not independently guaranteed by static documentation because Parallels asks users to list available OS types or distributions with `prlctl create ... --ostype list` or `--distribution list`. The reviewed command shape is consistent with Parallels CLI documentation, but users may need to select the closest available Linux distribution on their installed Parallels version.
