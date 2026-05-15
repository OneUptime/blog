# Validation Summary: How to Change the Default systemd Target (Runlevel) on RHEL

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd targets and runlevel compatibility aliases
- systemctl
- GRUB 2
- Boot Loader Specification (BLS) snippets

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systemd - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Configuring kernel command-line parameters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, boot loader configuration layout - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_kernel_considerations-in-adopting-rhel-9
- systemd.special manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
- systemctl manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd.target manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.target.html
- systemd.unit manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html

## Issues Found
- The runlevel mapping table labeled runlevel 2 as the "RHEL default". RHEL's default target depends on the installation profile, and `multi-user.target` is the typical server/minimal default rather than runlevel 2 specifically. Removed the misleading default label from the runlevel 2 row.
- The GRUB temporary edit instructions only mentioned a line starting with `linux`. Red Hat's kernel command-line documentation notes that some UEFI systems use `linuxefi`, so the instruction now mentions both.
- The permanent GRUB instructions used the old UEFI output path `/boot/efi/EFI/redhat/grub.cfg`. In RHEL 9, GRUB configuration is unified under `/boot/grub2/grub.cfg`, and the UEFI path is a stub that should not be recreated with `grub2-mkconfig`. Updated the command to use `/boot/grub2/grub.cfg`.
- The permanent GRUB instructions edited `GRUB_CMDLINE_LINUX` but did not update BLS snippets. Red Hat's RHEL 9 documentation says to use `grub2-mkconfig -o /boot/grub2/grub.cfg --update-bls-cmdline` when overwriting BLS snippets from `/etc/default/grub`, so the command was updated.

## Review Notes
The remaining `systemctl get-default`, `systemctl set-default`, `systemctl isolate`, `systemctl list-units --type=target --state=active`, `systemctl list-dependencies`, rescue/emergency target descriptions, `systemd.unit=` boot override examples, and custom target `AllowIsolate=yes` usage align with the consulted Red Hat and upstream systemd documentation.
