# Validation Summary: How to Recover from accidental rm -rf on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (general Linux filesystem recovery)
- `umount` (with `-l` lazy unmount)
- `rsync` (backup restoration)
- `tar` (archive restoration)
- Timeshift (snapshot restore/create)
- `lsof` and `/proc/PID/fd/N` (recovering open deleted files)
- `extundelete` (ext3/ext4 recovery)
- `testdisk` and `photorec` (filesystem recovery and file carving)
- `foremost` (file carving)
- `dd` and `dc3dd` (raw disk imaging)
- `dpkg -S` and `apt --reinstall` (system library recovery)
- `trash-cli` (`trash` command)
- `chattr +i` (immutable attribute)

## Sources Consulted
- Timeshift CLI source (AppConsole.vala): https://github.com/linuxmint/timeshift/blob/master/src/AppConsole.vala — confirmed `--snapshot` and `--comments` flags (plural form accepted)
- trash-cli project README: https://github.com/andreafrancia/trash-cli — confirmed the `trash` command is provided alongside `trash-put`
- TestDisk documentation: https://www.cgsecurity.org/wiki/TestDisk_Step_By_Step
- extundelete man page and project docs (sourceforge) — confirmed `--restore-all`, `--restore-file`, `--restore-directory` flags and `RECOVERED_FILES/` output directory
- foremost(8) man page — confirmed `-t`, `-i`, `-o` flags
- dc3dd man page — confirmed `if=`, `of=`, `bs=`, `log=` syntax
- Ubuntu package repository — confirmed `extundelete`, `testdisk`, `foremost`, `dc3dd`, `trash-cli`, `timeshift` are all available in the universe component

## Issues Found
No technical issues found.

## Review Notes
- The testdisk menu navigation in "Option 4" is slightly compressed ("Choose 'Undelete' or 'Advanced' to browse inodes"). In current testdisk, the actual path on ext4 is: select disk → select partition table type → choose "Advanced (Filesystem Utils)" → select partition → "Undelete". The post's wording isn't wrong (Advanced leads to Undelete), just terse. Left as-is since it's accurate enough for an interactive walkthrough.
- testdisk's "Undelete" feature is most effective on FAT filesystems. For ext3/ext4 specifically (the relevant case for most Ubuntu setups), `extundelete` (Option 3) and `photorec`'s carving (Option 4) are generally more productive than testdisk's undelete. The post implicitly recognizes this by listing extundelete first.
- `md5sum /dev/sda2 /external/backup.img` for verification can produce mismatches if the partition is still being written to during the `dd` snapshot. For forensic-grade work, the partition should be unmounted or the source should be read-only. The technique itself is correct as a sanity check.
- `extundelete` is no longer under active upstream development (last release ~2012), but it is still packaged in current Ubuntu releases and remains the standard tool for this task. No replacement is currently more recommended for ext4 metadata-based recovery.
- The "Creating a Disk Image First" section logically belongs before any recovery tool is run, but appears after the tool sections. This is a structural/ordering observation, not a technical inaccuracy.
- The `alias rm='trash'` line relies on the `trash` command shipped by the `trash-cli` package; verified this command exists. Some older guides use `trash-put` instead, which would also work.
