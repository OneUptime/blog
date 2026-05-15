# Validation Summary: How to Host a Kickstart File on a Network Server for PXE Boot on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart
- PXE boot
- DHCP and ISC dhcpd configuration
- TFTP
- Apache HTTP Server
- GRUB and SYSLINUX/PXELINUX
- firewalld
- systemd
- SELinux
- vsftpd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Preparing a PXE installation source: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/preparing-for-a-network-install_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Automatically installing RHEL, Starting Kickstart installations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 documentation: Boot options for RHEL Installer: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/boot_options_for_rhel_installer/index
- Red Hat Enterprise Linux 9 documentation: Using systemd unit files to customize and optimize your system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/using_systemd_unit_files_to_customize_and_optimize_your_system/proc_providing-feedback-on-red-hat-documentation_working-with-systemd
- ISC DHCP 4.4 manual page for dhcpd.conf: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf

## Issues Found
- The PXE sequence diagram said the kernel and initrd were fetched over HTTP, but the provided PXELINUX/GRUB examples load them from the TFTP tree. Changed those diagram steps to TFTP.
- The UEFI setup copied boot files from the deployment server's installed EFI system partition. That can be missing or unrelated to the RHEL installation media. Changed the commands to copy `BOOTX64.EFI` and `grubx64.efi` from the copied RHEL installation tree.
- The UEFI GRUB menu used `linuxefi` and `initrdefi`. Red Hat's RHEL 9 PXE examples use `linux` and `initrd` in the GRUB configuration, so the menu entries were updated accordingly.
- The DHCP architecture matching used a narrow vendor-class substring comparison for BIOS and UEFI. Red Hat's RHEL 9 network boot example defines DHCP option 93 as `architecture-type` and branches on it while matching PXE clients by vendor class. Updated the sample DHCP configuration to use that pattern.
- The DHCP interface-binding section showed an in-place `sed` edit against `/etc/systemd/system/dhcpd.service`, which is not the packaged unit location on RHEL and can fail if that local override file does not already exist. Replaced it with the systemd override approach already shown in the post.
- The TFTP monitoring command watched `tftp`, but the post starts TFTP through socket activation. Updated it to watch both `tftp.socket` and `tftp.service`.

## Review Notes
- The corrected examples follow Red Hat's RHEL 9 PXE and Kickstart documentation. Some environments may need additional DHCP handling for other UEFI architecture codes or for native UEFI HTTP boot, but that is an environment-specific extension rather than an error in the tutorial.
