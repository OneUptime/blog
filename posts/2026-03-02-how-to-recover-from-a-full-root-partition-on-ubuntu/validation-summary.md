# Validation Summary: How to Recover from a Full Root Partition on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ubuntu Linux (Server and Desktop)
- systemd / systemd-journald / systemd-coredump
- APT / dpkg package management
- ext4 filesystem (tune2fs, resize2fs, e2fsck)
- LVM (lvextend, lvs, vgs)
- parted partition tool
- logrotate
- Docker (system prune)
- PostgreSQL (VACUUM, pg_size_pretty)
- ncdu, lsof, find, du, df utilities
- Bash scripting and cron

## Sources Consulted
- systemd journalctl man page (https://www.freedesktop.org/software/systemd/man/journalctl.html) — verified `--disk-usage`, `--rotate`, `--vacuum-size`, `--vacuum-time`
- systemd coredumpctl man page (https://www.freedesktop.org/software/systemd/man/coredumpctl.html) — verified supported subcommands (list, info, dump, debug)
- systemd-coredump documentation (https://www.freedesktop.org/software/systemd/man/systemd-coredump.html) — verified default storage location `/var/lib/systemd/coredump/`
- Ubuntu Server Guide: LVM (https://ubuntu.com/server/docs/manage-volume-groups) — verified `lvextend`, `vgs`, `lvs` syntax
- e2fsprogs documentation (man resize2fs, man tune2fs, man e2fsck) — verified flags and online resize support
- GNU parted documentation — verified `resizepart` interactive command
- Docker CLI reference (https://docs.docker.com/engine/reference/commandline/system_prune/) — verified `system df`, `system prune`, `-a --volumes` flags
- APT/dpkg man pages — verified `apt-get clean`, `apt-get autoremove --purge`, `dpkg --purge` and `dpkg --list`
- logrotate man page — verified configuration directives (daily, rotate, compress, delaycompress, missingok, notifempty, sharedscripts, postrotate)
- PostgreSQL documentation — verified `\l+`, `pg_total_relation_size`, `pg_size_pretty`, `VACUUM FULL VERBOSE`
- GNU coreutils df documentation — verified `--output=source,size,used,avail,pcent,target`

## Issues Found

1. **`sudo coredumpctl clean` is not a valid command.** The systemd `coredumpctl` utility only supports the subcommands `list`, `info`, `dump`, and `debug` (and the alias `gdb`). There is no `clean` subcommand; running it would fail with an "Unknown command" error. Fixed by replacing it with the correct approach: removing files from `/var/lib/systemd/coredump/`, which is where `systemd-coredump` stores core dumps by default. The subsequent `journalctl --rotate && --vacuum-time=1s` line was kept because the core dump metadata is also written to the journal.

## Review Notes
- The `find / -name "core" -o -name "core.[0-9]*"` expression works correctly because `find` adds an implicit `-print` to the whole expression when no explicit action is given; both branches of `-o` will print.
- The `tail -n+2` skip-header trick in the disk-usage script is correct for `df --output` since the first line is always the header.
- The advice to keep ext4's 5% reserved block count on the root partition is sound — reducing it on `/` can prevent root from logging in to recover a full disk situation, which is exactly the scenario the post is about.
- The `apt-get autoremove --purge -y` claim of removing "all but the current kernel" is accurate for modern Ubuntu where the kernel meta-packages are managed via APT; however, this only removes kernels that APT considers automatically installed, so manually installed kernels still need `dpkg --purge` — which the post correctly mentions as the more aggressive alternative.
- The `resize2fs` online-resize claim is correct for ext4 (and ext3); online shrinking is not supported, but online growing is.
- The LVM device path `/dev/ubuntu-vg/ubuntu-lv` matches the default created by the Ubuntu Server installer when LVM is selected.
- The `parted resizepart 1 30GB` syntax is correct for parted's interactive prompt; users should be aware parted modifies the partition table immediately, so backups are advisable before resizing.
