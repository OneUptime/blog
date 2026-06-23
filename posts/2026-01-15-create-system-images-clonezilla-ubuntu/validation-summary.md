# Validation Summary: How to Create System Images with Clonezilla on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Clonezilla Live and Clonezilla Server Edition (SE)
- `ocs-sr` (Clonezilla's core save/restore command)
- DRBL (Diskless Remote Boot in Linux) and PXE multicast deployment
- partclone
- Ubuntu (NFS, Samba/SMB, SSH/SFTP, S3 image repositories)
- Bootable USB creation (dd, Balena Etcher, Ventoy)
- Bash scripting, cron, systemd timers, Ansible

## Sources Consulted
- Clonezilla Live documentation index — https://clonezilla.org/clonezilla-live-doc.php
- `ocs-sr` man page (official Clonezilla docs) — https://clonezilla.org/fine-print-live-doc.php?path=clonezilla-live%2Fdoc%2F98_ocs_related_command_manpages
- Clonezilla downloads page — https://clonezilla.org/downloads.php
- Clonezilla compression discussion / dwaves.de clonezilla options reference

## Issues Found

1. **Incorrect compression flag (`-z`) mappings (two locations).**
   The post mapped `-z3` → "lz4", `-z4` → "lz4hc", `-z7` → "zstd", and `-z6p` → "parallel lzop". Per the `ocs-sr` man page the correct mappings are: `-z3` = lzop, `-z4` = lzma, `-z5p` = parallel xz, `-z6p` = parallel lzip, `-z7` = lrzip, `-z8` = lz4, `-z8p` = lz4mt, `-z9` = zstd, `-z9p` = parallel zstd.
   - Fixed the "Step 8: Select compression" option list to: `-z3` (lzop), `-z5p` (parallel xz), `-z6p` (parallel lzip), `-z7` (lrzip), `-z8` (lz4), `-z9` (zstd), `-z9p` (parallel zstd).
   - Fixed the "Compression options explained" block: `-z3` is now lzop, removed the bogus `-z4`/lz4hc line, and added correct `-z8` (lz4) and `-z9` (zstd) entries.

2. **Incorrect description of the `-i` option.**
   The Performance Optimization section claimed `-i` "specify threads", with `-i 0` = "use all available CPU cores" and `-i 4096` = "split files into 4GB chunks for parallel processing". The `-i` option actually sets the split image-file *volume size in MB* and has nothing to do with thread count. Rewrote the bullet to describe `-i` as the split volume size (`-i 4096` ≈ 4GB volumes) and noted that the parallel compressors (`-z1p`/`-z5p`/`-z9p`) already use all CPU cores automatically.

3. **Incorrect `-e1` / `-e2` descriptions (multicast parameters section).**
   The post described `-e1 auto` as "Auto-select EFI partition" and `-e2` as "Skip EFI partition cloning (use source EFI)". Per the man page, these are CHS/geometry options, not EFI-related: `-e1` forces/auto-adjusts the CHS value of the NTFS boot partition, and `-e2` forces use of the CHS values from EDD when creating the partition table. Corrected both descriptions. (The `-e1 auto -e2` flags in the example commands themselves are part of Clonezilla's standard recommended restore flag set and were left unchanged.)

4. **Invalid PXE boot parameter.**
   The PXE `APPEND` line contained `ocs_daession="auto"`, which is not a valid Clonezilla/DRBL boot parameter (it appears to be a garbled token). Removed it; the remaining `ocs_server`, `ocs_live_run`, and `ocs_live_batch` parameters are sufficient for the unattended restore.

## Review Notes
- The `ocs-sr` flag set used throughout (`-q2`, `-c`, `-j2`, `-g auto`, `-k1`, `-r`, `-rescue`, `-gm`, `-gs`, `-icds`, `-rm-win-swap-hib`, `-ntfs-ok`, `-a`, `-nogui`) is accurate and matches the official man page.
- The Clonezilla Live version referenced (`3.1.2-22-amd64`) and the SourceForge download URL pattern are plausible and well-formed; readers should still check the downloads page for the current stable release.
- The `balena-etcher` snap name and the To-RAM "≥1GB RAM" figure are reasonable but not verified against an authoritative spec; both are non-critical.
- The `-x` parameter in the `drbl-ocs` example is described only tautologically ("Use -x for multicast"); the multicast behavior is primarily selected by the `multicast_restore_*` mode argument. Left as-is since it is not incorrect, just unspecific.
- NFS/Samba/SSH server setup, the bash backup/restore scripts, cron/systemd scheduling, and the Ansible playbook are all syntactically sound and use current, non-deprecated commands.
