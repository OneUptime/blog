# Validation Summary: How to Load and Unload Kernel Modules on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux kernel modules
- `lsmod`, `modinfo`, `modprobe`, `insmod`, `rmmod` (kmod tools)
- `/etc/modules`, `/etc/modules-load.d/`, `/etc/modprobe.d/` configuration
- `softdep`, `blacklist`, `install`, `options`, `alias` directives in modprobe.d
- `update-initramfs`
- DKMS (Dynamic Kernel Module Support)
- Secure Boot module signing (`sign-file`, MOK)
- `/proc/modules`, `/sys/module/*/parameters/`, `/proc/sys/kernel/module_sig_enforce`

## Sources Consulted
- kmod project man pages (verified locally): `modprobe(8)`, `modinfo(8)`, `rmmod(8)`, `modprobe.d(5)`
- Confirmed `modprobe` flags: `-v`, `-r`, `--dry-run`, `--show-depends`, `--ignore-install`
- Confirmed `modinfo` `-F`/`--field` accepts `depends` and other field names
- Confirmed `rmmod` `-f`/`--force` requires `CONFIG_MODULE_FORCE_UNLOAD`
- Confirmed `softdep modulename pre: modules... post: modules...` syntax
- Confirmed `install <module> <command>` syntax and `--ignore-install` pattern
- Linux kernel documentation on module signing (`scripts/sign-file`) and `module_sig_enforce`
- DKMS documentation on the dpkg trigger / `dkms autoinstall` workflow on Debian/Ubuntu
- systemd-modules-load.service documentation for `/etc/modules-load.d/`

## Issues Found
- **DKMS rebuild timing inaccuracy** — The post said "When you install a new kernel, DKMS recompiles all registered modules for the new kernel version during boot." On Ubuntu/Debian, DKMS rebuilds run via the kernel package's post-install hooks (dpkg triggers) at the time the new kernel is installed, not during boot. Updated the sentence to clarify the timing and to note the modules are ready when you reboot into the new kernel.

## Review Notes
- All commands, flags, file paths, and configuration syntax (including `blacklist`, `install <module> /bin/false`, `softdep`, `options`, and `alias net-pf-10 ipv6`) verified against the kmod man pages and are accurate.
- Module parameter examples (`e1000e EEE=1`, `ath9k nohwcrypt=1`) are valid parameters for those drivers.
- The `softdep bridge pre: stp` example is syntactically correct, though `stp` is typically a hard dependency of `bridge` rather than a soft one — the example demonstrates the syntax even if `bridge`/`stp` isn't the most natural real-world pair. Left as-is since the syntax is correct and replacing it would be a stylistic change.
- `/lib/modules/$(uname -r)/scripts/sign-file` location: on Ubuntu it lives under `/usr/src/linux-headers-$(uname -r)/scripts/sign-file` as stated; this is a compiled binary shipped by the headers package.
- `lsmod` output and the `rmmod: ERROR: Module bridge is in use by:` error message format match current kmod output.
- The `cat /proc/modules | head -10` example is a useless-use-of-cat but functionally correct; left unchanged.
