# Validation Summary: How to Use systemd-nspawn for Lightweight Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd-nspawn
- systemd-container package
- machinectl
- debootstrap / mmdebstrap
- systemd template units (systemd-nspawn@.service)
- nspawn unit configuration (`/etc/systemd/nspawn/*.nspawn`)
- Linux veth and bridge networking (`ip` command)
- cgroup-based resource control (CPUQuota, CPUAffinity, MemoryMax)
- Ubuntu cloud images

## Sources Consulted
- Ubuntu jammy `machinectl(1)` manpage — https://manpages.ubuntu.com/manpages/jammy/man1/machinectl.1.html
- Ubuntu jammy `systemd-nspawn(1)` manpage — https://manpages.ubuntu.com/manpages/jammy/man1/systemd-nspawn.1.html
- Ubuntu cloud images directory listing — https://cloud-images.ubuntu.com/minimal/releases/jammy/release/
- `systemd.nspawn(5)` configuration reference (for `[Exec]`, `[Files]`, `[Network]` sections)

## Issues Found
1. **"Resource Control" section header was missing the `##` markdown prefix.** Promoted the heading so it renders as a section header consistent with the rest of the post.
2. **`--system-call-filter=@basic-io` was incorrectly labeled as "Limit CPU usage (50% of one core)".** The `--system-call-filter` option modifies the container's seccomp allowlist; it has nothing to do with CPU throttling. Replaced the example with the correct mechanisms: `--property=CPUQuota=50%` (transient unit property) and `--cpu-affinity=0-1` (pinning to specific cores), both of which are valid `systemd-nspawn` CLI options for resource control.
3. **`pull-raw` was used with a `.tar.xz` URL.** Per `machinectl(1)`, `pull-raw` accepts `.qcow2` / raw disk images (optionally `.gz`/`.xz`/`.bz2` compressed), while `pull-tar` accepts `.tar`/`.tar.gz`/`.tar.xz`/`.tar.bz2` archives. Swapped the two examples so the Ubuntu rootfs tarball is pulled with `pull-tar`, and the `pull-raw` example now references a `.raw.xz` URL.
4. **Incorrect Ubuntu cloud image filename: `ubuntu-22.04-minimal-cloudimg-amd64.root.tar.xz`.** The actual published artifact is `ubuntu-22.04-minimal-cloudimg-amd64-root.tar.xz` (hyphen before `root`, not a dot). Fixed the URL.

## Review Notes
- `machinectl pull-raw` / `pull-tar` / `pull-dkr` are marked deprecated in newer systemd releases (v256+) in favor of `importctl`, but they remain functional on Ubuntu 22.04 (systemd v249) and current Ubuntu LTS releases, so the examples still work as written.
- The post claims nspawn requires "No separate daemon" — strictly speaking, `machinectl` operations are mediated by `systemd-machined`, but invoking `systemd-nspawn` directly does not require any extra daemon beyond `systemd` itself, so the comparison point is defensible.
- The veth interface naming (`ve-<machine>` on the host, `host0` inside the container) is correct for systemd-nspawn's default behavior.
- The example appends a second `[Exec]` section to the `.nspawn` file via `tee -a`; systemd merges duplicate sections so this works, but in production it would be cleaner to consolidate options into a single `[Exec]` block.
