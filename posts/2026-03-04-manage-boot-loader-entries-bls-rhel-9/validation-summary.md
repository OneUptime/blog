# Validation Summary: How to Manage Boot Loader Entries (BLS) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Boot Loader Specification (BLS)
- GRUB2
- grubby
- dnf kernel package management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring kernel command-line parameters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation, "Considerations in adopting RHEL 9 - Notable changes to boot loader": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_kernel_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9.3 Release Notes, "New default behavior of grub2-mkconfig with BLS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features
- UAPI Group Boot Loader Specification: https://uapi-group.org/specifications/specs/boot_loader_specification/
- grubby(8) manual page reference: https://man.docs.euro-linux.com/EL%208/grubby/grubby.8.en.html

## Issues Found
- The sample BLS entry used `grub_class rhel`, while Red Hat's RHEL 9 BLS examples use `grub_class kernel`. Updated the sample to `grub_class kernel` to match the documented RHEL 9 format.
- The field table omitted `grub_arg` even though the sample entry included `grub_arg --unrestricted`. Added a table row explaining that it is a GRUB-specific argument for the menu entry.

## Review Notes
The post's `grubby` examples, BLS file location, BLS entry structure, and RHEL 9 `/boot/grub2/grub.cfg` guidance align with Red Hat documentation. RHEL 9.3 and later changed `grub2-mkconfig` behavior so it no longer overwrites BLS snippet command lines by default when `GRUB_ENABLE_BLSCFG=true`; the post's guidance remains consistent with that behavior.
