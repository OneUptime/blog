# Validation Summary: How to Use Predictable Interface Names in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Linux predictable network interface names
- Talos network configuration documents
- Talos kernel command-line arguments
- talosctl

## Sources Consulted
- Talos Linux Predictable Interface Names: https://docs.siderolabs.com/talos/v1.13/networking/predictable-interface-names
- Talos Linux LinkConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/linkconfig
- Talos Linux LinkAliasConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/linkaliasconfig
- Talos Linux Kernel reference: https://docs.siderolabs.com/talos/v1.13/reference/kernel
- Talos Linux Image Factory documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/image-factory
- Talos Linux 1.12 release notes for network configuration deprecation/replacement: https://docs.siderolabs.com/talos/v1.12/getting-started/what%27s-new-in-talos
- Talos Linux boot loader documentation for UKI/systemd-boot and GRUB kernel argument behavior: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/bootloader
- Talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- systemd Predictable Network Interface Names: https://systemd.io/PREDICTABLE_INTERFACE_NAMES/

## Issues Found
- The post used legacy `machine.network.interfaces` examples. Talos v1.12 introduced replacement network configuration documents and deprecated the old interface configuration, so the examples were updated to current `LinkConfig` documents.
- The post recommended `.machine.install.extraKernelArgs` plus `biosdevname=0` for disabling predictable names. Current Talos documentation documents `net.ifnames=0`; modern systemd-boot/UKI installs embed kernel arguments in boot assets, so the section was updated to use Image Factory `customization.extraKernelArgs` and explain the older GRUB-only `.machine.install.extraKernelArgs` behavior.
- The device selector section described the older `deviceSelector` interface configuration. It was updated to current `LinkAliasConfig` examples using CEL selectors, then `LinkConfig` against the alias.
- The AWS EC2 examples showed `ens5`/`ens6`. Talos documentation states cloud platforms such as AWS still use the old `eth0` naming scheme because Talos automatically adds `net.ifnames=0`, so the examples were changed to `eth0`/`eth1`.
- The post said "the kernel" tries the predictable naming schemes. This was adjusted to Talos applying the systemd-style predictable naming behavior, avoiding the implication that the kernel alone performs the renaming.

## Review Notes
Platform-specific interface examples such as VMware, KVM/QEMU, and Hyper-V can still vary based on hypervisor settings and boot platform, but the corrected text now frames them as examples rather than guarantees.
