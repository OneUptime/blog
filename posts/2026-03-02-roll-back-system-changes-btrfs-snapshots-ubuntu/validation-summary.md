# Validation Summary: How to Roll Back System Changes with Btrfs Snapshots on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Btrfs filesystem (subvolumes, snapshots, quotas/qgroups)
- Ubuntu (root filesystem on Btrfs)
- Timeshift (CLI usage, Btrfs mode)
- GRUB 2 (custom menu entries via `/etc/grub.d/40_custom`)
- APT / dpkg hooks (`DPkg::Pre-Invoke`)
- Standard Linux utilities: `df`, `lsblk`, `mount`, `umount`, `mv`

## Sources Consulted
- Btrfs Wiki and kernel.org docs on subvolumes, snapshots and qgroups: https://btrfs.readthedocs.io/en/latest/Subvolumes.html and https://btrfs.readthedocs.io/en/latest/Quotas.html
- `btrfs-subvolume(8)` and `btrfs-qgroup(8)` man pages
- Timeshift CLI documentation: https://github.com/linuxmint/timeshift (CLI flags `--btrfs`, `--create`, `--list`, `--restore`, `--delete`, `--tags`, `--scripted`, `--comments`)
- Ubuntu installer's standard Btrfs layout (`@` for root, `@home` for home)
- GRUB 2 manual on custom menu entries and `rootflags=subvol=`: https://www.gnu.org/software/grub/manual/grub/grub.html
- Debian/Ubuntu `apt.conf(5)` for `DPkg::Pre-Invoke` syntax

## Issues Found
1. **GRUB menu entry referenced wrong paths.** The earlier "manual snapshots" section creates the snapshot at `/mnt/snapshots/@_before_upgrade`, but the example `40_custom` entry pointed at `/@_before_upgrade/boot/vmlinuz` and `rootflags=subvol=@_before_upgrade`. GRUB would have failed to find the kernel because the snapshot lives under `/snapshots/`. Fixed the paths to `/snapshots/@_before_upgrade/boot/vmlinuz` and `rootflags=subvol=snapshots/@_before_upgrade`, and added a clarifying note that the paths must match wherever the snapshot is stored, plus a note that read-only snapshots aren't bootable directly.
2. **Missing `mkdir` for `/mnt/snapshots`.** `btrfs subvolume snapshot` does not create the parent directory, so the snapshot command would have failed on a fresh setup. Added `sudo mkdir -p /mnt/snapshots` before the snapshot command.
3. **Missing `mkdir` for `/tmp/snapshot-inspect`.** Same issue for the inspection mount point. Added `sudo mkdir -p /tmp/snapshot-inspect` and removed the redundant `subvolid=5` mount at `/mnt` that was unused for inspection.
4. **Broken qgroup helper script.** The original `while read sv` loop piped subvolume paths (`@`, `@home`, ...) into `grep` against `btrfs qgroup show /` output. That command prints qgroup IDs in the form `0/SUBVOLID` and contains no path strings, so the grep would always match nothing. Replaced with `sudo btrfs qgroup show --human-readable -p /` (a real, working invocation) and added an explanation of how to map qgroup IDs to subvolume IDs from `btrfs subvolume list`.

## Review Notes
- The `sudo timeshift --btrfs` command on its own is a slightly unusual invocation — `--btrfs` is a mode flag normally combined with an action (`--create`, `--list`, etc.). On Ubuntu/Mint Timeshift builds it does still set the working mode and is harmless, so I left it as written.
- The Timeshift `--tags O` (on-demand), `--scripted`, `--comments`, `--create`, `--list`, `--restore`, and `--delete` flags are all correct against the upstream linuxmint/timeshift CLI.
- The `DPkg::Pre-Invoke` hook is syntactically valid for `/etc/apt/apt.conf.d/`. A real production setup might prefer `DPkg::Pre-Install-Pkgs` or a dedicated tool like `apt-btrfs-snapshot`, but the example as written works.
- The rollback procedure from a live USB (rename `@` to `@_broken`, create a fresh writable snapshot named `@` from the saved snapshot) is the canonical Btrfs rollback workflow and is correct.
- The post does not mention setting the default subvolume with `btrfs subvolume set-default`, which is an alternative rollback mechanism, but that's a stylistic choice, not an error.
