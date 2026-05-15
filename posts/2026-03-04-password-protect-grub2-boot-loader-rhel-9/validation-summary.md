# Validation Summary: How to Password-Protect the GRUB2 Boot Loader on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB2
- Boot Loader Specification (BLS)
- `grub2-setpassword`
- `grub2-mkconfig`
- GRUB authentication and `password_pbkdf2`

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Protecting GRUB with a password": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_protecting-grub-with-a-password_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation, "Securing the boot menu with password by using the bootloader RHEL system role": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-the-grub-2-boot-loader-by-using-rhel-system-roles_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation, "Reinstalling GRUB": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/assembly_reinstalling-grub_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 release notes, "New default behavior of grub2-mkconfig with BLS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features
- GNU GRUB Manual 2.14, "Authentication and authorisation in GRUB": https://www.gnu.org/software/grub/manual/grub/html_node/Authentication-and-authorisation.html

## Issues Found

1. **Missing root privileges in the initial password command**: Changed the first `grub2-setpassword` example to `sudo grub2-setpassword`. Red Hat documents this command as being run as root, and it writes `/boot/grub2/user.cfg`.

2. **Incorrect RHEL 9 UEFI regeneration path**: Removed the separate `sudo grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg` command and replaced the note with a single RHEL 9 BIOS/UEFI command using `/boot/grub2/grub.cfg`. Red Hat's RHEL 9 documentation states that the actual `grub.cfg` is at `/boot/grub2/grub.cfg` for both BIOS and UEFI systems, and that the UEFI path is a stub that must not be recreated with `grub2-mkconfig`.

## Review Notes
- The `grub2-setpassword` flow, `/boot/grub2/user.cfg` location, default `root` boot loader username, and behavior of protecting GRUB entry editing but not normal booting match Red Hat documentation.
- The GRUB `set superusers`, `password_pbkdf2`, and `--unrestricted` concepts match the GNU GRUB manual.
- On RHEL 9 with BLS, password-protecting booting of individual entries is better handled through BLS entry attributes such as `grub_users`; the post correctly keeps that advanced topic brief and recommends the simpler `grub2-setpassword` path for the stated use case.
