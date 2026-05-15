# Validation Summary: How to Harden the RHEL Bootloader with GRUB2 Password Protection

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB2 bootloader
- GRUB PBKDF2 password authentication
- Boot Loader Specification entries
- UEFI and Secure Boot
- Linux audit rules

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel - GRUB configuration and RHEL system role password protection. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9 - UEFI GRUB stub behavior. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/
- Red Hat Enterprise Linux 8 documentation: Protecting GRUB with a password. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_protecting-grub-with-a-password_managing-monitoring-and-updating-the-kernel
- GNU GRUB manual: Authentication and authorisation. https://www.gnu.org/software/grub/manual/grub/html_node/Authentication-and-authorisation.html
- GNU GRUB manual: menuentry command options. https://www.gnu.org/software/grub/manual/grub/html_node/menuentry.html

## Issues Found
- The post instructed UEFI users to regenerate `/boot/efi/EFI/redhat/grub.cfg`. On RHEL 9, Red Hat documents `/boot/grub2/grub.cfg` as the correct output path for both BIOS and UEFI systems, and the EFI path is a stub that must not be recreated with `grub2-mkconfig`. Updated the UEFI command and removed the EFI stub from the permissions example.
- The post advised editing `/etc/grub.d/10_linux` to add `--unrestricted`. RHEL 9 uses BLS-based boot entries, and Red Hat's password workflow protects editing while leaving normal booting unrestricted. Replaced the template edit with a verification command for `--unrestricted`.
- The post created `/etc/grub.d/01_users`, which can conflict with RHEL's existing GRUB password helper script. Changed the custom script path to `/etc/grub.d/01_users_custom` throughout.
- The multiple-user example claimed different access levels while only one user was listed as a superuser. Updated it to describe multiple GRUB superusers and include both users in `set superusers`.

## Review Notes
The manual `password_pbkdf2` approach is valid GRUB syntax, but Red Hat's documented operational workflow for RHEL systems commonly uses `grub2-setpassword` or the `bootloader` RHEL system role. Future revisions could consider showing that supported workflow as the primary path.
