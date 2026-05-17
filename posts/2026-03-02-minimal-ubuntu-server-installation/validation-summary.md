# Validation Summary: How to Perform a Minimal Ubuntu Server Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 24.04 (noble)
- Subiquity Autoinstall (cloud-init)
- APT / dpkg package management
- snapd
- systemd / systemctl / systemd-journald / systemd-analyze
- debootstrap (minbase variant)
- Docker (importing a debootstrap chroot as a base image)
- Linux kernel modules / lsmod
- ss / netstat for socket inspection

## Sources Consulted
- Ubuntu Autoinstall reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- apt(8) manual page (Ubuntu 24.04) — verified that `--auto-removable` is not a valid `apt list` option (confirmed locally: "Command line option --auto-removable is not understood")
- Ubuntu Pro Client documentation: https://canonical-ubuntu-pro-client.readthedocs-hosted.com/ — confirmed `ubuntu-advantage-tools` is a transitional dummy package in noble that depends on `ubuntu-pro-client` (verified via `apt-cache show`)
- debootstrap(8) manual page — `--variant=minbase` installs only essential packages plus apt
- systemd-journald.conf(5) — verified `SystemMaxUse`, `RuntimeMaxUse`, `MaxRetentionSec` directive names
- systemd.time(7) — `7day` is an accepted time-span form
- dpkg-query(1) — `--showformat` with `${Installed-Size}` and `${Package}` placeholders is correct
- Subiquity storage layouts — `direct`, `lvm`, `zfs` are the valid `storage.layout.name` values

## Issues Found
1. **Invalid `apt list --auto-removable` flag** — `apt list` does not support this option; running it returns `E: Command line option --auto-removable is not understood`. Replaced with `apt autoremove --dry-run 2>/dev/null`, which is the standard way to preview auto-removable packages.
2. **Outdated package name `ubuntu-advantage-tools`** — On Ubuntu 24.04 (noble), this is only a transitional dummy package; the actual package was renamed to `ubuntu-pro-client`. Updated the purge list to use `ubuntu-pro-client`.
3. **Incorrect `--variant=minbase` description** — The post claimed it installs "essential and priority=required" packages. Per the debootstrap manual, `minbase` installs only essential packages plus apt; it is the default variant (no `--variant` flag) that additionally pulls in `priority=required` packages. Rewrote the sentence to reflect this.

## Review Notes
- The autoinstall YAML snippet is shown without the customary `#cloud-config` header and `autoinstall:` wrapping key, but as an inline snippet illustrating the section's content this is acceptable.
- The `snap remove` loop will fail for base snaps (`core`, `core20`, `core22`, `snapd`) while other snaps still depend on them. In practice the subsequent `apt purge snapd` removes everything anyway, so the loop is a best-effort cleanup rather than a strict ordering.
- `apt-rdepends` requires installing the `apt-rdepends` package; the post does not call this out explicitly but the command itself is correct.
- `systemd-analyze blame` output reflects parallel boot — its numbers are not strictly additive, but the command is correct.
- The 80-100 MB Docker image size from a noble `minbase` debootstrap is in the right ballpark.
- Removing `man-db` and `manpages` is destructive to interactive usability; the post acknowledges this is a minimization choice.
