# Validation Summary: How to Configure GRUB2 Boot Loader Parameters on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB2
- Boot Loader Specification (BLS)
- grubby
- grub2-mkconfig
- grub2-editenv
- Linux kernel command-line parameters

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring kernel command-line parameters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 "Considerations in adopting RHEL 9", boot loader changes: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf
- Red Hat Enterprise Linux 9.3 release notes, BLS behavior for grub2-mkconfig: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/9.3_release_notes/9.3_release_notes
- GNU GRUB Manual, simple configuration: https://www.gnu.org/software/grub/manual/grub/html_node/Simple-configuration.html
- GNU GRUB Manual, serial terminal: https://www.gnu.org/software/grub/manual/grub/html_node/Serial-terminal.html
- GNU GRUB Manual, environment block: https://www.gnu.org/software/grub/manual/grub/html_node/Environment-block.html

## Issues Found
- The post described `/boot/efi/EFI/redhat/grub.cfg` as the generated GRUB configuration for UEFI systems and advised running `grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg`. In RHEL 9, GRUB configuration files are unified under `/boot/grub2/`, and the UEFI file is a stub that loads `/boot/grub2/grub.cfg`. I changed the file table, diagram, and command examples to use `/boot/grub2/grub.cfg` for both BIOS and UEFI systems.
- The post implied that a normal `grub2-mkconfig` run applies `GRUB_CMDLINE_LINUX` changes to existing BLS boot entries. Current RHEL 9 documentation says BLS snippets are not overwritten by default; `--update-bls-cmdline` is required when you intentionally want to update existing BLS snippets from `GRUB_CMDLINE_LINUX`. I added that caveat and command.

## Review Notes
- `grubby --update-kernel=ALL --args=...`, `grubby --update-kernel=ALL --remove-args=...`, BLS entry locations, and the verification commands are consistent with Red Hat's RHEL 9 kernel command-line documentation.
- The serial console example is technically valid, but sites should tune the serial speed and unit to match their hardware.
