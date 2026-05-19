# Validation Summary: How to Debug Kernel Panics on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- Linux kernel panic and oops diagnostics
- kdump and kdump-tools
- crash utility
- GRUB kernel command-line parameters
- systemd journal and dmesg
- Magic SysRq
- Kernel debug symbols
- rasdaemon / RAS hardware error reporting

## Sources Consulted
- Ubuntu Server documentation: Kernel crash dump - https://ubuntu.com/server/docs/how-to/software/kernel-crash-dump/
- Ubuntu Server documentation: Debug symbol packages - https://documentation.ubuntu.com/server/how-to/debugging/debug-symbol-packages/
- Ubuntu manpage: kdump-config - https://manpages.ubuntu.com/manpages/noble/man8/kdump-config.8.html
- Ubuntu manpage: crash - https://manpages.ubuntu.com/manpages/bionic/man8/crash.8.html
- Ubuntu manpage: rasdaemon - https://manpages.ubuntu.com/manpages/stonking/man1/rasdaemon.1.html
- Ubuntu manpage: ras-mc-ctl - https://manpages.ubuntu.com/manpages/stonking/man8/ras-mc-ctl.8.html
- Linux kernel documentation: Magic SysRq - https://docs.kernel.org/admin-guide/sysrq.html
- Linux kernel documentation: sysctl kernel parameters - https://docs.kernel.org/admin-guide/sysctl/kernel.html
- Linux kernel documentation: kernel command-line parameters - https://docs.kernel.org/admin-guide/kernel-parameters.html
- Linux kernel documentation: tainted kernels - https://docs.kernel.org/admin-guide/tainted-kernels.html

## Issues Found
- The tainted-kernel description was too narrow. It only mentioned non-GPL modules, but kernel taint flags also cover out-of-tree modules, unsigned modules, warnings, machine-check errors, and other conditions. Updated the wording.
- The kdump crash-dump log command used `/var/crash/*/dmesg.txt`, but Ubuntu kdump-tools writes files such as `dmesg.<timestamp>`. Updated the glob to `dmesg.*`.
- The debug-symbol installation command incorrectly used `linux-crashdump` as a fallback for missing `-dbgsym` packages. Updated it to point readers to Ubuntu ddebs setup and then install `linux-image-$(uname -r)-dbgsym`.
- The symbol lookup example used `nm` on `/boot/System.map-$(uname -r)`, which is a text symbol map rather than an object file. Replaced it with `grep`.
- The stack-trace decoding example referenced `decode_stacktrace.sh` as if it were installed by `linux-tools-common` and available on `PATH`. Updated it to install matching kernel headers and call the script from `/usr/src/linux-headers-$(uname -r)/scripts/`.
- The OOM explanation implied the OOM killer itself commonly causes panics by killing critical processes. Clarified that OOM is not always a panic and that `vm.panic_on_oom` controls panic-on-OOM behavior.
- The hardware error section used `mcelog`, which is not available in the current Ubuntu 24.04 package repository checked locally. Replaced it with `rasdaemon` and `ras-mc-ctl`, which are available and documented in Ubuntu manpages.
- The Magic SysRq examples used shell redirection to privileged `/proc` files without becoming root, which fails when run with ordinary `sudo echo`. Replaced the sysrq setting with `sudo sysctl -w` and trigger writes with `sudo tee`.

## Review Notes
The guide is technically relevant and broadly aligned with Ubuntu's current kdump workflow. Future improvements could mention that crash-dump analysis requires matching the dump with the exact crashed kernel version, especially when analyzing dumps on a different system.
