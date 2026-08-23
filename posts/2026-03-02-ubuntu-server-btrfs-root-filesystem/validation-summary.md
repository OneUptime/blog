# Validation Summary: How to Install Ubuntu Server with Btrfs as the Root File System

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Btrfs (B-tree filesystem)
- Ubuntu Server / Subiquity installer
- systemd timers (btrfs-scrub, snapper-timeline, snapper-cleanup)
- snapper (snapshot management tool)
- GRUB
- fstab / mount options (compress=zstd, noatime, ssd, subvol)
- chattr (NoCOW attribute)
- Btrfs RAID

## Sources Consulted
- btrfs-filesystem(8) manpage and kernel.org Btrfs documentation: https://btrfs.readthedocs.io/en/latest/btrfs-filesystem.html
- btrfs-subvolume(8): https://btrfs.readthedocs.io/en/latest/btrfs-subvolume.html
- btrfs-scrub(8): https://btrfs.readthedocs.io/en/latest/btrfs-scrub.html
- Ubuntu Btrfs wiki: https://help.ubuntu.com/community/btrfs
- Snapper documentation: http://snapper.io/documentation.html
- Btrfs Wiki on Compression: https://btrfs.readthedocs.io/en/latest/Compression.html
- Btrfs Wiki on RAID: https://btrfs.readthedocs.io/en/latest/btrfs-man5.html
- systemd unit naming / path escaping conventions for btrfs-scrub@.timer

## Issues Found
1. **Incorrect `--dryrun` flag on `btrfs filesystem defragment`** (Performance Tuning section).
   The original post had: `sudo btrfs filesystem defragment -r -v --dryrun / 2>&1 | tail -5` with a comment claiming this shows fragmentation statistics.
   - `btrfs filesystem defragment` has no `--dryrun` option (valid options are `-v`, `-r`, `-c[<algo>]`, `-f`, `-s`, `-l`, `-t`). Running the command as written would actually defragment the entire root filesystem rather than produce a report, which is a destructive surprise.
   - **Fix**: Replaced with `sudo btrfs filesystem usage /`, which is the closest accurate built-in command for inspecting filesystem allocation/usage. Updated the comment accordingly.

2. **Incorrect snapshot path in rollback procedure** (Rolling Back from a Snapshot section).
   The original post referenced `/mnt/.snapshots/root-20240315-143022` after mounting the partition at `/mnt` with no `subvol` option.
   - When you mount a Btrfs filesystem without specifying a subvolume, you get the top-level subvolume (ID 5), where the user-created subvolumes appear as directories named exactly as they were created (`@`, `@home`, `@snapshots`, `@var-log`). The `.snapshots` path only exists when the `@snapshots` subvolume is explicitly mounted there. The rollback `mv` therefore needs to reference `/mnt/@snapshots/root-...`.
   - **Fix**: Changed `/mnt/.snapshots/root-20240315-143022` to `/mnt/@snapshots/root-20240315-143022` and added a clarifying comment that snapshots live under the `@snapshots` subvolume at the top level. Also tweaked the preceding comment to clarify that the mount is of the top-level Btrfs subvolume.

3. **Incorrect claim that the Subiquity installer creates `@` and `@home` subvolumes** (In the Subiquity Installer section).
   The original post stated that "the installer will set up subvolumes" and that "Ubuntu typically creates" `@` and `@home`. Reported by an external contributor in https://github.com/OneUptime/blog/pull/163.
   - Subiquity has never created Btrfs subvolumes. Canonical documents this explicitly under "Limitations and workarounds": the installer cannot configure Btrfs subvolumes (https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/configure-storage.html). The subiquity source contains no subvolume creation code, and curtin, which applies the storage config, has no Btrfs subvolume support either. Tracked as Launchpad bug #1881932, open since 2020. Subvolume creation did exist in the older debian-installer and Ubiquity installers via Ubuntu's patched `partman-btrfs`.
   - A reader following the original text would have written an fstab referencing `subvol=@` against a disk with no `@`, producing an unbootable system.
   - **Fix**: The paragraph now states plainly that Subiquity does not create subvolumes, tells the reader how to check (`sudo btrfs subvolume list /`), notes which installers did create them, and points at the "Manual Btrfs Setup" section as the way to build the layout - flagging that on the root disk this must be done before first boot. That section's lead-in was widened to name the flat-root conversion case.

## Review Notes
- The Subiquity partitioning steps are accurate, but Subiquity does not create Btrfs subvolumes; a fresh Ubuntu Server install lands on a flat Btrfs filesystem (top-level subvolume, ID 5). See Issue 3 below.
- The claim that "GRUB's Btrfs support is limited" is somewhat dated — modern GRUB (2.04+) supports Btrfs with zstd, multi-device, and subvolumes — but keeping `/boot` on ext4 remains a common and defensible recommendation for simplicity and broad compatibility, so this was left unchanged.
- The `ssd` mount option is auto-detected by modern kernels but is still valid to specify explicitly.
- `btrfs-scrub@-.timer` correctly references the root filesystem via systemd path escaping (`/` → `-`).
- `compress=zstd:1` syntax (with level) is correct.
- `chattr +C` correctly sets the NoCOW attribute; readers should be aware this only affects newly created files in the directory — existing files need to be copied in (e.g., via `cp --reflink=never`) to acquire the attribute.
- The snapper config and timer commands are accurate for Ubuntu's snapper package.
- The RAID-5/6 warning is still accurate as of recent kernels — write hole issues remain, and the official Btrfs documentation continues to advise against using RAID 5/6 for production data.
