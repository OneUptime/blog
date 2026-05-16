# Validation Summary: How to Understand the BOOT Partition in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos bootloaders: GRUB and systemd-boot
- Unified Kernel Images (UKIs)
- Talos disk layout and system partitions
- Talos A/B OS upgrades and rollback
- `talosctl`
- Talos Image Factory and boot assets
- Kubernetes node boot and runtime storage

## Sources Consulted
- Talos v1.13 Boot Loader documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/bare-metal-platforms/bootloader
- Talos v1.13 Disk Layout documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos v1.13 Upgrading Talos Linux documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos v1.13 Boot Assets documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/boot-assets
- Talos v1.13 Kernel reference: https://docs.siderolabs.com/talos/v1.13/reference/kernel
- Talos v1.13 CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos source resource definitions for `cmdline`, `kernelparams`, `securitystate`, and `bootedentries`: https://github.com/siderolabs/talos/tree/v1.13.0/pkg/machinery/resources/runtime

## Issues Found
- The post described the BOOT partition as universal. Updated it to clarify that BOOT applies to GRUB-based installations, while new UEFI installations since Talos 1.10 use `systemd-boot` and UKIs stored in the EFI partition.
- The disk layout listed BOOT as the second partition after EFI/BIOS. Updated the layout to distinguish current UEFI `systemd-boot` layouts from GRUB-based layouts.
- The boot process incorrectly said the bootloader reads the META partition to determine the boot slot. Reworded this to avoid overstating META's role and to describe boot entries/boot references more accurately.
- The kernel parameter inspection command used `talosctl get kernelparams`, which reports kernel parameter status resources rather than `/proc/cmdline`. Replaced it with `talosctl get cmdline`.
- The post implied `.machine.install.extraKernelArgs` works for all installations. Added the `systemd-boot` caveat: the field is ignored there because kernel arguments are embedded in UKIs.
- The troubleshooting command `talosctl get bootassetstatus` did not match current Talos resources. Replaced it with `talosctl get bootedentries` and added `talosctl get securitystate -o yaml` for UKI detection.
- The custom image example used an old imager command and version-pinned extension images. Replaced it with the recommended Image Factory schematic format using `officialExtensions`.
- Updated examples from older Talos v1.7.0 values to current v1.13.0-oriented examples.

## Review Notes
The post is now technically accurate for current Talos behavior, but it still focuses on the BOOT partition. Future revisions could split GRUB BOOT details and current UEFI UKI details into separate sections for readability.
