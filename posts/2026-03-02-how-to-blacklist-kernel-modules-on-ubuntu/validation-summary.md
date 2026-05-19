# Validation Summary: How to Blacklist Kernel Modules on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Linux kernel modules
- kmod/modprobe
- modprobe.d configuration
- initramfs-tools
- systemd modules-load.d
- GRUB kernel command-line parameters

## Sources Consulted
- Linux `modprobe(8)` manual: https://man7.org/linux/man-pages/man8/modprobe.8.html
- Linux `modprobe.d(5)` manual: https://man7.org/linux/man-pages/man5/modprobe.d.5.html
- Linux `modules-load.d(5)` manual: https://man7.org/linux/man-pages/man5/modules-load.d.5.html
- Linux kernel command-line parameters documentation: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Ubuntu Server documentation for blocking `nouveau` with modprobe configuration: https://documentation.ubuntu.com/server/how-to/graphics/gpu-virtualization-with-qemu-kvm/
- Ubuntu security documentation for module-loading controls: https://documentation.ubuntu.com/security/security-features/kernel-protections/
- Local `update-initramfs(8)`, `lsinitramfs(8)`, `lsmod(8)`, `modinfo(8)`, and `rmmod(8)` manuals/help output

## Issues Found
- The post listed only `/lib/modprobe.d/` as distro-provided modprobe configuration. Updated it to include `/usr/lib/modprobe.d/`, which is the current directory documented by `modprobe.d(5)` and may be reached through `/lib` compatibility paths.
- The udev inspection command only read `/etc/udev/rules.d/*.rules` and could fail when no matching files exist. Replaced it with a recursive `grep` across `/etc/udev/rules.d/` and `/lib/udev/rules.d/`.
- The `nouveau` example used `alias nouveau off` and described it as preventing dependency or alias loads. Replaced that with `install nouveau /bin/false` for explicit load blocking and clarified that `blacklist` suppresses internal aliases but does not by itself block an explicit `modprobe nouveau`.
- The verification section claimed plain `sudo modprobe nouveau` would not load a blacklisted module. Updated it to use `sudo modprobe -b nouveau` for blacklist-aware testing and kept plain `sudo modprobe nouveau` only for the stricter `install /bin/false` case.
- The GRUB boot-parameter section described the change as non-permanent even though editing `/etc/default/grub` persists until removed. Reworded it as testing without a `modprobe.d` file and added the removal step.
- The module removal section used deprecated `modprobe -r --remove-dependencies`. Replaced it with `modprobe -r --remove-holders`, matching current `modprobe --help` output.
- The security section mentioned kernel lockdown alone for stronger enforcement. Broadened it to include module-signing policies and `kernel.modules_disabled`, which Ubuntu documents as a module-loading control.

## Review Notes
The post is technically relevant and accurate after the corrections. Future improvements could mention that `install` commands in `modprobe.d` are powerful but may eventually be replaced by stronger dependency declarations such as soft dependencies for some use cases, as noted in `modprobe.d(5)`.
