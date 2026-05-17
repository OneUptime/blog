# Validation Summary: How to Set Up Boot-Time Snapshot Integration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (Btrfs root filesystem)
- Btrfs (subvolumes and snapshots)
- GRUB bootloader
- grub-btrfs (Antynea/grub-btrfs)
- grub-btrfsd systemd daemon
- Snapper (snapshot management)
- APT DPkg pre/post invoke hooks

## Sources Consulted
- grub-btrfs upstream repository: https://github.com/Antynea/grub-btrfs
- grub-btrfs README: https://github.com/Antynea/grub-btrfs/blob/master/README.md
- grub-btrfs default config: https://raw.githubusercontent.com/Antynea/grub-btrfs/master/config
- grub-btrfs Makefile: https://raw.githubusercontent.com/Antynea/grub-btrfs/master/Makefile
- Snapper documentation: http://snapper.io/documentation.html
- btrfs-progs manual (`btrfs-subvolume(8)`)

## Issues Found
1. **Invalid config variable `GRUB_BTRFS_SNAPSHOT_DIRNAME`** — The post listed this as the variable for setting the snapshot search path. This variable does not exist in `grub-btrfs`. The tool auto-scans the Btrfs root partition for read-only subvolumes rather than reading a path from config. Removed it and replaced with a note explaining that path exclusion (not inclusion) is controlled via `GRUB_BTRFS_IGNORE_SPECIFIC_PATH` / `GRUB_BTRFS_IGNORE_PREFIX_PATH`.

2. **Invalid config variable `GRUB_BTRFS_NEWEST_SNAPSHOT_FIRST`** — Replaced with the real variable `GRUB_BTRFS_SUBVOLUME_SORT="-rootid"`, which is the actual mechanism documented in the upstream config (and `-rootid` is in fact the default).

3. **Incorrect default for `GRUB_BTRFS_LIMIT`** — The post claimed `0 = show all`. The upstream config documents the default as `"50"` and does not document a special `0` behavior. Updated the comment to reflect the actual default.

4. **Misleading description of snapshot discovery** — The post said grub-btrfs "looks for read-only Btrfs subvolumes in specific locations. The default search path is `/.snapshots`." In reality, the 41_snapshots-btrfs script scans the whole Btrfs root partition. The `/.snapshots` path is what the `grub-btrfsd` daemon watches by default (for inotify-driven regeneration). Reworded to distinguish the two behaviors and to mention that Timeshift requires `--timeshift-auto` instead.

## Review Notes
- Install paths (`/etc/grub.d/41_snapshots-btrfs`, `/usr/lib/systemd/system/grub-btrfsd.service`, `/etc/default/grub-btrfs/config`) match the upstream `Makefile`.
- The Snapper retention variables (`NUMBER_*`, `TIMELINE_*`) and the snapper subcommands (`create-config`, `create --type single`, `list`, `diff`) are all valid for current Snapper releases.
- The custom APT `DPkg::Pre-Invoke` / `Post-Invoke` hook is functional but fragile: it derives the pre-snapshot number with `snapper list | tail -1 | awk '{print $1}'`, which depends on `snapper list` row ordering and column position. Upstream Snapper ships a pacman/zypper-style helper (`snapper-rollback` / `snapper.service`) on some distros; on Debian/Ubuntu, the `snapper` package does not include native apt hooks, so a custom hook is the typical approach. Left as-is since it is not strictly incorrect.
- Btrfs commands (`btrfs subvolume list`, `btrfs subvolume snapshot -r`, `mount -o subvolid=5`) are correct.
- `grub-btrfs` requires `bash >= 4`, `btrfs-progs`, `grub`, `gawk`, and `inotify-tools` (for the daemon). The post installs `git make inotify-tools` for the build, which is reasonable; `btrfs-progs` will already be present on a Btrfs-root system.
- The post does not pin to a specific grub-btrfs release; users following these steps will get the master branch, which can change. Not a defect, just a caveat.
