# Validation Summary: How to Install RHEL on ARM-Based (aarch64) Hardware

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ARM64 / AArch64 hardware
- UEFI boot
- Anaconda installer
- Linux bootable USB media
- PXE / TFTP / DHCP network boot
- Red Hat Subscription Manager
- CodeReady Linux Builder repository

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: System requirements and supported architectures: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/interactively_installing_rhel_from_installation_media/interactively_installing_rhel_from_installation_media
- Red Hat Enterprise Linux 9 documentation: Creating bootable installation media: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/assembly_creating-a-bootable-installation-medium_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Interactively installing RHEL over the network / PXE and UEFI TFTP setup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/interactively_installing_rhel_over_the_network/index
- Red Hat Enterprise Linux 9 documentation: Boot options reference / console boot options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/custom-boot-options_rhel-installer
- Red Hat Enterprise Linux 9 release notes: deprecated subscription-manager modules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/deprecated-functionalities
- Red Hat Subscription Central documentation: Simple Content Access: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-prep-reg-rhel
- IANA DHCPv6 Parameters: Processor Architecture Types: https://www.iana.org/assignments/dhcpv6-parameters

## Issues Found
- The PXE section said the ARM GRUB EFI binary is `grubaa64.efi` but copied only `BOOTAA64.EFI`. I changed the wording to identify `BOOTAA64.EFI` as the ARM64 UEFI fallback boot file and updated the example to copy the full `EFI` directory into the TFTP tree, matching Red Hat's documented UEFI PXE layout.
- The DHCP snippet used `architecture-type` without defining DHCP option 93. I added `option architecture-type code 93 = unsigned integer 16;` and kept the ARM64 UEFI architecture value `00:0b`, which matches the IANA processor architecture assignment for ARM 64-bit UEFI.
- The post used `subscription-manager attach --auto`. Red Hat documents the `attach` and `auto-attach` modules as deprecated with Simple Content Access, so I replaced it with `subscription-manager status` after registration.
- The serial console example implied `ttyAMA0` was generally correct for ARM servers. I added a note to use the firmware-exposed console device and identify `ttyAMA0` as a common ARM64 value.
- The closing claim that aarch64 has the same package ecosystem as x86_64 was too absolute because package availability can vary by architecture. I softened it to the broad RHEL package ecosystem and lifecycle.

## Review Notes
- The USB creation flow and `dd` usage are consistent with Red Hat's documented approach of writing the ISO directly to the whole USB device, not a partition.
- The CodeReady Builder repository ID `codeready-builder-for-rhel-9-aarch64-rpms` follows the standard RHEL 9 repository naming pattern for the aarch64 architecture.
- Red Hat documents an AArch64 PXE caveat for RHEL 9.5 and later: older GRUB versions can hang after downloading the newer PE32+ `vmlinuz`; PXE servers should use GRUB 2.06-61.el9 or later when using extracted RHEL 9.5+ AArch64 boot files.
