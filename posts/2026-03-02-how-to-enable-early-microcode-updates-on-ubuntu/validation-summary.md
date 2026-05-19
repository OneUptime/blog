# Validation Summary: How to Enable Early Microcode Updates on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel x86 microcode loader
- initramfs-tools
- GRUB
- Intel and AMD CPU microcode packages
- apt and dpkg package management

## Sources Consulted
- Linux kernel documentation: The Linux Microcode Loader: https://docs.kernel.org/arch/x86/microcode.html
- Intel Software Security Guidance: Loading Microcode from the OS: https://www.intel.com/content/www/us/en/developer/articles/technical/software-security-guidance/secure-coding/loading-microcode-os.html
- Ubuntu Launchpad package description for microcode-initrd: https://code.launchpad.net/ubuntu/jammy/amd64/microcode-initrd
- iucode_tool manual page: https://man.he.net/man8/iucode_tool
- Local Ubuntu man pages for `lsinitramfs(8)`, `unmkinitramfs(8)`, and `update-initramfs(8)`
- Local Ubuntu package metadata for `intel-microcode`, `amd64-microcode`, and `microcode-initrd`

## Issues Found
- The post said microcode can be applied at "two points" but listed BIOS/UEFI, early OS, and late OS loading. Changed this to "three points."
- The initramfs hook check used `/etc/initramfs-tools/hooks/`, but Ubuntu microcode packages install their hooks under `/usr/share/initramfs-tools/hooks/`. Updated the command to check both package and local hook directories.
- The GRUB verification text implied early microcode is generally a separate GRUB initrd. On Ubuntu with initramfs-tools it is normally embedded as a prepended uncompressed cpio section; `/boot/microcode.cpio` is created by the optional `microcode-initrd` package for initrd-less boot scenarios. Updated the wording and command comment.
- The `/proc/cpuinfo` verification text implied the CPU microcode revision should match the Debian package version. Package versions and CPU microcode revisions are different values. Updated the comment to avoid that false comparison.
- The late-loading section checked `/dev/cpu/*/microcode` and used `iucode-tool --write-earlyfw`, which creates an early initramfs archive rather than applying a runtime update. Updated the example to check `/sys/devices/system/cpu/microcode/reload` and trigger reload through the kernel sysfs interface.

## Review Notes
- Late microcode loading is less preferred than early loading and, per current Linux kernel documentation, is not enabled by default since Linux 5.19; rebooting after package updates remains the production-safe path.
- Some verification commands, such as `rdmsr`, require extra tooling and privileges, but the command usage itself is valid.
