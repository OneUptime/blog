# Validation Summary: How to Create Full System Backups with tar on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- GNU tar
- gzip and xz compression
- SELinux labels
- POSIX ACLs and extended attributes
- GRUB 2
- Linux rescue and chroot recovery workflows

## Sources Consulted
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- Local GNU tar help output: `tar --help`
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, tar SELinux context guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/htmlsingle/selinux_users_and_administrators_guide/sect-security-enhanced_linux-maintaining_selinux_labels-information_gathering_tools
- Red Hat Enterprise Linux 7 System Administrator's Guide, GRUB 2 configuration paths and `grub2-mkconfig`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-working_with_the_grub_2_boot_loader
- Red Hat Enterprise Linux 8 Managing, monitoring, and updating the kernel, GRUB 2 configuration paths and reinstall procedure: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/
- Red Hat Enterprise Linux 8 Installation Guide, rescue mode GRUB reinstall prerequisites and UEFI Secure Boot warning: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/interactively_installing_rhel_from_installation_media/troubleshooting-after-installation_rhel-installer

## Issues Found
- The backup commands did not preserve RHEL-relevant metadata such as ACLs, extended attributes, and SELinux labels. Added `--acls --xattrs --selinux` to archive creation and restore commands because GNU tar and Red Hat documentation require these options for that metadata.
- The `p` flag explanation said it preserves permissions in a way that implied archive creation behavior. Updated the wording to clarify that `-p` preserves file permissions when extracting.
- The xz backup and automation examples omitted some exclusions and `--one-file-system`, making them inconsistent with the main full-root-filesystem example. Added the missing excludes and `--one-file-system`.
- The restore example recreated `/tmp` but did not restore sticky permissions, and omitted `/var/tmp` despite excluding it during backup. Added `/var/tmp` and `chmod 1777` for both temporary directories.
- The restore example used `chroot` before preparing a usable recovery environment. Added bind mounts for `/dev`, `/sys`, and `/run`, and a proc mount for `/proc`.
- The restore example treated `grub2-install /dev/sda` as a generic bootloader repair. Labeled it as BIOS-specific and added the documented UEFI GRUB configuration path as a comment.
- The post described the command as backing up the entire root filesystem while also using `--one-file-system`. Clarified that separate filesystems such as `/boot` or `/home` must be backed up separately or handled intentionally.

## Review Notes
The commands are examples and still require administrators to adapt device names, mount points, backup storage location, and UEFI or Secure Boot recovery steps to the specific RHEL system.
