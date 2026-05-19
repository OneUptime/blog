# Validation Summary: How to Set GRUB Boot Options and Default Kernel on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GRUB 2 (Grand Unified Bootloader)
- Ubuntu Linux
- Linux kernel boot parameters
- `/etc/default/grub` configuration
- `update-grub` / `grub-mkconfig`
- `grub-set-default` / `grub-reboot`
- `grub-mkpasswd-pbkdf2` (PBKDF2 password hashing)
- `grub-install`
- Serial console configuration
- Kernel command-line parameters (mitigations, transparent_hugepage, isolcpus, nohz_full, rcu_nocbs, intel_pstate, intel_iommu, loglevel, console)

## Sources Consulted
- GNU GRUB Manual: https://www.gnu.org/software/grub/manual/grub/grub.html
- `grub-mkconfig(8)` man page (GRUB 2.12)
- `grub-reboot(8)` man page
- `grub-set-default(8)` man page
- `grub-mkpasswd-pbkdf2(1)` man page
- `info grub` documentation on GRUB_TIMEOUT_STYLE and related variables
- Ubuntu Community Help: https://help.ubuntu.com/community/Grub2
- Linux kernel admin-guide: kernel-parameters documentation (https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html)

## Issues Found
No technical issues found.

All technical claims in the post were verified:
- The configuration file paths (`/etc/default/grub`, `/boot/grub/grub.cfg`) and `update-grub` workflow are correct.
- `GRUB_DEFAULT` accepts a number, a menu entry title (with `>` separating submenu components), or `saved` — verified against `grub-set-default(8)` and `grub-reboot(8)` man pages.
- `GRUB_TIMEOUT=-1` (wait indefinitely) and `GRUB_TIMEOUT=0` (boot immediately) behaviors are correct.
- `GRUB_TIMEOUT_STYLE` values (`menu`, `countdown`, `hidden`) match the official GRUB manual.
- The distinction between `GRUB_CMDLINE_LINUX` (all modes) and `GRUB_CMDLINE_LINUX_DEFAULT` (normal boot) is accurate.
- All listed kernel parameters (`mitigations=off`, `transparent_hugepage=never`, `isolcpus`, `nohz_full`, `rcu_nocbs`, `intel_pstate=disable`, `intel_iommu=on iommu=pt`, `loglevel=7`, `console=tty0 console=ttyS0,115200n8`) are valid and behave as described.
- `GRUB_TERMINAL` and `GRUB_SERIAL_COMMAND` syntax for serial console setup is correct.
- The `password_pbkdf2` directive syntax in `/etc/grub.d/40_custom` is correct.
- The chroot recovery procedure is correct for BIOS systems.
- `cat /proc/cmdline` is the correct way to verify active kernel parameters.

## Review Notes
- The Emergency Recovery section assumes a BIOS/legacy boot setup with `grub-install /dev/sda`. UEFI systems require `grub-install` without a disk argument (it uses EFI variables) and additionally require mounting the EFI System Partition and `/run` before chrooting. The current procedure works for BIOS but readers on UEFI may need to adapt it. This is not strictly an error but a scope limitation worth noting.
- The `GRUB_TIMEOUT_STYLE=hidden` comment says "show on SHIFT". On BIOS this is correct; on UEFI it is typically ESC (and behavior varies by firmware). Minor caveat, not an error.
- `isolcpus` as a kernel boot parameter is still functional but the kernel community has been moving toward cgroup-based CPU isolation (cpusets) for newer setups. The post's usage remains valid for current Ubuntu LTS kernels.
- Kernel version `5.15.0-91-generic` in the example output is from the Ubuntu 22.04 LTS kernel line, which is realistic at the time of writing.
