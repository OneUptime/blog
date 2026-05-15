# Validation Summary: How to Change the Default Boot Kernel on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel packages
- GRUB2
- grubby
- DNF
- Boot Loader Specification entries

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing, monitoring, and updating the kernel, including `grubby`, BLS entries, and GRUB regeneration guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_monitoring_and_updating_the_kernel/managing-monitoring-and-updating-the-kernel.pdf
- Red Hat Enterprise Linux for Real Time 9: Specifying the RHEL kernel to run, including `grubby --default-kernel` and `grubby --set-default`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/installing_rhel_9_for_real_time/assembly_specifying-the-kernel-to-run_installing-rhel-9-for-real-time
- GNU GRUB Manual: `next_entry` one-time boot behavior used by `grub-reboot`/`grub2-reboot`: https://www.gnu.org/software/grub/manual/grub/html_node/next_005fentry.html
- DNF Configuration Reference: `installonly_limit` syntax and default value: https://dnf.readthedocs.io/en/stable/conf_ref.html

## Issues Found
- The post said you can configure dnf to keep a specific kernel as the default, but the commands shown only record and reset the GRUB default with `grubby`. I changed the wording to match the actual commands.
- The troubleshooting section used `/boot/efi/EFI/redhat/grub.cfg` as the `grub2-mkconfig` output path for UEFI. Red Hat's RHEL 9 documentation says the real generated `grub.cfg` is `/boot/grub2/grub.cfg` for both BIOS and UEFI, and that the UEFI path is a stub that must not be recreated with `grub2-mkconfig`. I changed the command to use `/boot/grub2/grub.cfg` for both.

## Review Notes
The `grubby` and `grub2-reboot` examples are valid, but index-based selections can change when kernels are added or removed. Using the full kernel path or BLS entry ID is usually safer for persistent automation.
