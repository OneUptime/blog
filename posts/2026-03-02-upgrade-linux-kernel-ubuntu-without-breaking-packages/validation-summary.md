# Validation Summary: How to Upgrade the Linux Kernel on Ubuntu Without Breaking Packages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (LTS releases, GA and HWE kernels)
- Linux kernel (apt-managed kernel packages, meta-packages)
- APT / dpkg (apt, apt-cache, dpkg)
- DKMS (Dynamic Kernel Module Support)
- GRUB (grub-reboot, grub-editenv, update-grub, /etc/default/grub)
- Third-party kernel modules (NVIDIA, ZFS, VirtualBox)
- systemd journal (journalctl)
- Linux audit framework (ausearch)

## Sources Consulted
- `grub-reboot(8)` man page — confirmed available options (`-h`, `-V`, `--boot-directory`); there is no `--output-name` flag.
- `grub-editenv(1)` man page — confirmed `list` subcommand for showing saved GRUB environment variables.
- `journalctl(1)` man page — confirmed `-p FROM..TO` priority range syntax and `-b -1` for previous boot.
- Ubuntu Wiki: Kernel/LTSEnablementStack — confirmed `linux-generic-hwe-22.04` meta-package name and HWE kernel progression on 22.04.
- DKMS documentation — confirmed `dkms status -k <kernel>`, `dkms build module/version`, and `dkms install module/version --kernelver <ver>` syntax.
- apt manpages — confirmed `--dry-run`, `apt-cache policy`, `apt-cache rdepends`, `apt list --upgradable` are correct.
- Ubuntu package naming conventions — verified package patterns `linux-image-*-generic`, `linux-headers-*-generic`, `linux-modules-*-generic`.

## Issues Found
1. **Invalid `grub-reboot --output-name` command (line 34, original).** `grub-reboot` only accepts `-h`, `-V`, and `--boot-directory`; there is no `--output-name` flag. Replaced with `sudo grub-editenv list` and `grep GRUB_DEFAULT /etc/default/grub`, which are the standard ways to inspect the saved default boot entry on Ubuntu.

2. **Broken `NEW_KERNEL` extraction logic in the "Verifying the Upgrade Will Succeed" section.** The original pipeline `apt-cache policy linux-image-generic | grep "Candidate:" | awk '{print $2}' | sed 's/linux-image-//'` was conceptually wrong: the `Candidate:` line shows the meta-package's apt version (e.g. `5.15.0.119.117`), not a string containing `linux-image-…`, so the `sed` substitution was a no-op and `$NEW_KERNEL` ended up holding an apt version string rather than a kernel release usable with `dkms status` (which expects something like `6.8.0-40-generic`). Also, the `2>/dev/null || uname -r` fallback only triggers on pipeline failure, not on a wrong value. Replaced with `NEW_KERNEL=$(ls /lib/modules/ | sort -V | tail -1)`, which reliably returns the newest installed kernel release directory name (the same form `dkms status -k` expects). Also switched `dkms status | grep "$NEW_KERNEL"` to the more precise `dkms status -k "$NEW_KERNEL"`.

## Review Notes
- Package names like `linux-image-VERSION` and `linux-modules-VERSION` are presented in shorthand; on real Ubuntu installs they carry a flavor suffix (`-generic`, `-aws`, `-azure`, etc.). The post is using `VERSION` as a placeholder, which is fine pedagogically.
- The `journalctl -p "err..alert"` priority range is in unusual order (numerically `3..1` rather than the more conventional `alert..err` = `1..3`). Modern journalctl tolerates either ordering, so this still works; left as-is.
- The advice to hold Shift during POST to bring up the GRUB menu is correct for BIOS systems; on UEFI systems users typically need to hold Esc instead. Not strictly incorrect since many Ubuntu Server deployments are still BIOS.
- Specific version numbers in examples (e.g., `6.8.0-40-generic`, NVIDIA `535.154.05`, ZFS `2.1.5`) are illustrative; they will continue to age but the syntactic patterns remain correct.
- The `apt-cache search linux-generic-hwe` command will work but returns several entries; `apt-cache search ^linux-generic-hwe-` would be more targeted. Not changed since the original is not incorrect.
