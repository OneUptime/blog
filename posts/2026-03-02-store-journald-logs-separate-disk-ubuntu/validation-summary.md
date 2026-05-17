# Validation Summary: How to Store journald Logs on a Separate Disk on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- systemd-journald (journald)
- Ubuntu / Linux system administration
- ext4 filesystem
- parted, mkfs.ext4, e2label, blkid (disk/partition tools)
- /etc/fstab mount configuration
- /etc/systemd/journald.conf configuration
- cron (system cron in /etc/cron.d/)
- POSIX file permissions and setgid bit

## Sources Consulted
- systemd-journald.service(8) manpage — verified /var/log/journal vs /run/log/journal behavior, SIGUSR1 vs SIGUSR2 semantics, and recommended directory creation/permissions
- journald.conf(5) manpage — verified Storage=, SystemMaxUse=, SystemKeepFree=, SystemMaxFileSize= option names and behavior
- parted(8) — verified mkpart PART-TYPE [FS-TYPE] START END syntax with --script mode
- fstab(5) — verified field order (UUID, mount point, fs, options, dump, fsck pass)
- crontab(5) / cron(8) — verified /etc/cron.d/ system crontab format with explicit user field

## Issues Found
No technical issues found. Spot-checks confirmed:
- `Storage=persistent`, `SystemMaxUse`, `SystemKeepFree`, `SystemMaxFileSize` are all valid journald.conf keys.
- SIGUSR2 correctly triggers journal file rotation (SIGUSR1 would flush volatile to persistent — distinct from rotation, and the post's stated intent matches SIGUSR2).
- `chown root:systemd-journal` + `chmod 2755 /var/log/journal` matches the canonical permissions that `systemd-tmpfiles` would apply.
- `parted /dev/sdb --script mklabel gpt mkpart primary ext4 0% 100%` is valid; on GPT, "primary" is treated as the partition name (not a partition type).
- fstab `0 2` dump/fsck pass values are correct for a non-root ext4 mount.
- /etc/cron.d file format (with explicit user field) and filename (alphanumeric/hyphen only) are valid.

## Review Notes
- The post manually sets ownership and mode on `/var/log/journal`. An equivalent, more idiomatic approach used by Debian/Ubuntu is `systemd-tmpfiles --create --prefix /var/log/journal`, which reads the canonical values from `/usr/lib/tmpfiles.d/systemd.conf`. Both produce the same result; the manual approach is not wrong.
- After creating `/var/log/journal` for the first time, sending SIGUSR1 (or running `journalctl --flush`) would migrate any in-memory/volatile log data over. The post chooses to discard volatile data instead, which is acceptable and explicitly noted in the text.
- `SystemMaxFileSize=500M` is a valid override; by default it is capped at 1/8 of `SystemMaxUse`.
- For very large journal partitions, users may also want to consider `SystemMaxFiles=` to bound the file count, but its omission is not an error.
