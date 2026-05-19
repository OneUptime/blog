# Validation Summary: How to Install Out-of-Tree Network Drivers on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Ubuntu (apt, ubuntu-drivers)
- Linux kernel modules
- DKMS (Dynamic Kernel Module Support)
- ip / iproute2
- ethtool
- lspci, lsusb
- modprobe / modinfo / lsmod
- update-initramfs
- Secure Boot / MOK (Machine Owner Key) / sign-file
- openssl (key/cert generation)
- Realtek r8125, r8168, r8169, rtl8812au, rtl8821ce drivers
- Broadcom STA (bcmwl-kernel-source) driver
- MediaTek MT7921 firmware
- journalctl / dmesg / udevadm

## Sources Consulted
- Ubuntu package archive (packages.ubuntu.com) for r8168-dkms, rtl8812au-dkms, bcmwl-kernel-source, linux-firmware, linux-modules-extra
- DKMS man pages and the dkms.conf reference (https://github.com/dell/dkms)
- Linux kernel documentation on module signing (Documentation/admin-guide/module-signing.rst) for sign-file argument order: `sign-file <hashalgo> <key> <x509> <module>`
- `mokutil` documentation (--sb-state, --import)
- `modprobe.d` man page (5) for `install` and `blacklist` directives
- awesometic/realtek-r8125-dkms GitHub repository (verified the dkms-install.sh script exists)
- linux-firmware repository / Ubuntu linux-firmware package contents (which include MediaTek MT7921 firmware)

## Issues Found
1. `mt7921u-firmware` is not a real Ubuntu package. MediaTek MT7921 (including the USB MT7921U variant) firmware is shipped as part of the `linux-firmware` package on Ubuntu, and the in-kernel `mt7921u` driver has been mainline since Linux 5.14. Replaced the line `sudo apt install mt7921u-firmware    # MediaTek 7921` with `sudo apt install linux-firmware      # MediaTek 7921 firmware ships in linux-firmware` and updated the comment to reflect this.

## Review Notes
- The `install r8169 modprobe r8125` directive in `/etc/modprobe.d/r8125-alias.conf` is a legitimate technique that overrides the install command for `r8169`, so PCI ID auto-loading of `r8169` is intercepted and `r8125` is loaded instead. It is somewhat redundant with the earlier `blacklist r8169` section, but both can coexist and the post presents them as alternative/complementary approaches.
- The minimal `dkms.conf` example omits `MAKE[0]` and `CLEAN`. DKMS will fall back to a default `make` invocation if `MAKE[0]` is unset, which works for many out-of-tree drivers whose Makefile follows the standard kernel module pattern. For non-standard build systems this would need to be set explicitly — fine for a basic example but worth noting.
- `DEST_MODULE_LOCATION[0]` is largely ignored by modern DKMS (modules end up under `/lib/modules/$(uname -r)/updates/dkms/`), but `dkms.conf` still requires the field to be present, so the example is correct.
- `eth0` is used as a placeholder interface name. Modern Ubuntu uses predictable names like `enp3s0`; readers should substitute their actual interface, which is consistent with the rest of the guide.
- `rtl8821ce-dkms` availability varies across Ubuntu releases (universe in some releases; a PPA on others). Left as-is since the package does exist in current Ubuntu archives, and the post is offering common examples rather than a definitive package list.
- All other commands (lspci, ethtool, ip, modprobe, dkms add/build/install, mokutil, openssl, sign-file argument order, update-initramfs) match official documentation.
