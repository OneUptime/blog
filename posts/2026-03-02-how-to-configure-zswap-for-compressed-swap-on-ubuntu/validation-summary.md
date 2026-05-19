# Validation Summary: How to Configure zswap for Compressed Swap on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel zswap
- Linux kernel zram
- GRUB kernel command-line parameters
- debugfs and sysfs
- Linux kernel compression algorithms

## Sources Consulted
- Linux kernel zswap documentation: https://www.kernel.org/doc/html/latest/admin-guide/mm/zswap.html
- Linux kernel zswap documentation for kernel 6.7 behavior with selectable zpool backends: https://www.kernel.org/doc/html/v6.7/admin-guide/mm/zswap.html
- Linux kernel zram documentation: https://docs.kernel.org/admin-guide/blockdev/zram.html
- Ubuntu update-grub man page: https://manpages.ubuntu.com/manpages/noble/en/man8/update-grub.8.html
- Local kernel/sysfs verification on Ubuntu kernel 6.17.0-20-generic for `/sys/module/zswap/parameters`

## Issues Found
- The GRUB examples used `zswap.zpool=z3fold`. Current kernel documentation describes zswap as using zsmalloc directly, while older kernels expose selectable zpool backends. I removed the zpool boot parameter from the persistent examples and used guarded runtime zpool changes only when `/sys/module/zswap/parameters/zpool` exists.
- The post recommended `z3fold` as the better memory-efficiency default. That is outdated for modern kernels where zsmalloc is the current/default backend and z3fold may be unavailable. I changed the guidance to prefer zsmalloc and describe z3fold as an older optional backend.
- The compressor-discovery command used `/sys/kernel/debug/crypto/`, which is not the standard interface for listing kernel crypto algorithms. I changed it to inspect `/proc/crypto` and clarified that `/sys/module/zswap/parameters/compressor` shows the current zswap compressor.
- The complete persistent configuration advised `/etc/modprobe.d/zswap.conf`. On Ubuntu kernels zswap is commonly built into the kernel, and kernel command-line parameters are the reliable early-boot configuration path. I removed the modprobe configuration block.
- The conclusion claimed zswap "eliminates most swap disk I/O." Kernel documentation frames this as potentially reduced swap I/O, so I softened the claim to "can reduce swap disk I/O."

## Review Notes
The post remains technically valid as a practical Ubuntu zswap guide after the fixes. zswap behavior is kernel-version-sensitive; future updates should re-check whether Ubuntu's active kernel still exposes the `zpool` sysfs parameter and whether any listed debugfs statistic names change.
