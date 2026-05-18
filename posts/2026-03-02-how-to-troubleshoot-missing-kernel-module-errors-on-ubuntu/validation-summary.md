# Validation Summary: How to Troubleshoot Missing Kernel Module Errors on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux kernel modules (modprobe, depmod, modinfo, lsmod)
- Ubuntu kernel package layout (`linux-modules`, `linux-modules-extra`, HWE kernels)
- `apt` / `dpkg` / `apt-file` package tooling
- `/etc/modprobe.d/`, `/etc/modules`, `/etc/modules-load.d/`
- initramfs-tools (`update-initramfs`, `lsinitramfs`, `/etc/initramfs-tools/modules`)
- systemd-modules-load.service
- DKMS
- Secure Boot / MOK (`mokutil`)
- Hardware discovery via `lspci -k`, `lsusb`, `udevadm`

## Sources Consulted
- modprobe(8) man page — https://man7.org/linux/man-pages/man8/modprobe.8.html
- modprobe.d(5) man page — https://man7.org/linux/man-pages/man5/modprobe.d.5.html (blacklist semantics)
- depmod(8) man page — https://man7.org/linux/man-pages/man8/depmod.8.html
- modinfo(8) man page — https://man7.org/linux/man-pages/man8/modinfo.8.html
- initramfs-tools(7) / `update-initramfs(8)` Ubuntu manpages
- Ubuntu package search — https://packages.ubuntu.com/ (verified `linux-modules-extra-hwe-22.04` does not exist as a meta-package)
- mokutil(1) man page (Secure Boot key enrollment / validation toggle)
- systemd-modules-load.service(8) — https://www.freedesktop.org/software/systemd/man/systemd-modules-load.service.html
- DKMS user manual — https://github.com/dell/dkms

## Issues Found

1. **Fictional `modprobe --show-depends` output.** The original example showed a `# modprobe requires: dca i2c-core ptp` line, which `modprobe --show-depends` never emits. The real output is one `insmod /path/to/module.ko` line per module (in dependency order), optionally with `install ...` lines. Rewrote the example to show three realistic `insmod` lines and dropped `i2c-core` from the manual-load sequence so it stays consistent.

2. **Incorrect blacklist override.** The post recommended `sudo modprobe -f modulename` to "temporarily override a blacklist." The `-f` flag only strips version/vermagic checks — it does not bypass blacklists. Per `modprobe.d(5)`, a `blacklist` directive only suppresses *alias-based* auto-loading; an explicit `modprobe modulename` already works. For `install <module> /bin/false` style entries, the correct override is `modprobe --ignore-install`. Replaced the line with both accurate techniques and an explanation of when each applies.

3. **`tee` overwriting `/etc/initramfs-tools/modules`.** The original `sudo tee /etc/initramfs-tools/modules << 'EOF' ... EOF` would truncate the file, destroying its default header/comments. Changed to `tee -a` so the snippet appends.

4. **`linux-modules-extra-hwe-22.04` does not exist.** Verified via packages.ubuntu.com that there is no such meta-package (nor `linux-modules-extra-generic-hwe-22.04`). For HWE kernels, the correct invocation is the same `linux-modules-extra-$(uname -r)` form already shown elsewhere in the post, since `uname -r` reports the running HWE kernel's exact version. Updated the HWE example accordingly.

5. **`depmod -ae` mislabelled as "force rebuild."** Per `depmod(8)`, `-e` reports unresolved symbols and only has effect when combined with `-F <System.map>`. `depmod -a` already always rebuilds; the opt-in "skip if unchanged" mode is `-A` (quick check). Replaced the `-ae` line with a correct `depmod -e -F /boot/System.map-$(uname -r) $(uname -r)` invocation for unresolved-symbol checking, and clarified the dry-run example (`depmod -n` prints to stdout the full `modules.dep` content, not just errors — piping into `head` keeps it manageable).

## Review Notes
- The `linux-modules-extra` package only exists for the `generic` (and a few other) flavours. On minimal cloud images that ship a `*-kvm` or `*-azure` kernel, `linux-modules-extra-$(uname -r)` may not exist; users should check `apt-cache search linux-modules-extra-$(uname -r)` if `apt install` reports "Unable to locate package."
- `find /lib/modules/$(uname -r)/ -name "*.ko*"` correctly matches both uncompressed `.ko` and compressed `.ko.zst` / `.ko.xz` modules used by newer Ubuntu kernels (24.04+ uses zstd-compressed modules). No change needed, but worth noting for readers on older systems where only `.ko` appears.
- `mokutil --disable-validation` only takes effect after a reboot and an in-firmware MOK Manager interaction; the post mentions the reboot but readers unfamiliar with Secure Boot may want to consult the `mokutil(1)` man page for the full flow.
- The DKMS rebuild example uses `dkms install -m modulename -v moduleversion -k $(uname -r)`. This is correct, but modern DKMS also accepts `dkms autoinstall -k $(uname -r)` which rebuilds every registered module for that kernel — useful when the user does not remember the exact module name/version.
