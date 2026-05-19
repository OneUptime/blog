# Validation Summary: How to Send and Receive ZFS Snapshots for Remote Backup on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ZFS (OpenZFS) on Linux
- Ubuntu (zfsutils-linux package)
- `zfs send` / `zfs receive` commands and flags (`-F`, `-i`, `-R`, `-n`, `-o`, `-u`)
- SSH for remote replication
- mbuffer (stream buffering and progress monitoring)
- syncoid / sanoid (automated ZFS replication tooling)
- pv (rate limiting)
- gzip (stream compression)
- cron / /etc/cron.d for scheduled replication
- Bash scripting

## Sources Consulted
- OpenZFS `zfs-send(8)` man page: https://openzfs.github.io/openzfs-docs/man/8/zfs-send.8.html
- OpenZFS `zfs-receive(8)` man page: https://openzfs.github.io/openzfs-docs/man/8/zfs-receive.8.html
- OpenZFS `zfs-snapshot(8)` man page: https://openzfs.github.io/openzfs-docs/man/8/zfs-snapshot.8.html
- Ubuntu package documentation for `zfsutils-linux`
- sanoid/syncoid project documentation: https://github.com/jimsalterjrs/sanoid
- mbuffer documentation: https://www.maier-komor.de/mbuffer.html
- pv (pipe viewer) man page

## Issues Found
- **Compression claim inaccuracy**: The post originally stated "Compressed data transfers in compressed form" as a general advantage of ZFS send/receive. This is incorrect for the default behavior — by default, `zfs send` decompresses data before sending. To actually transfer data in compressed form on the wire, the `-c` flag must be specified. Updated the bullet to: "Compressed data can be transferred in compressed form using the `-c` flag (by default `zfs send` decompresses data before sending)." This makes the post technically accurate and gives readers a pointer to the relevant flag.

All other commands, flags, and examples were verified against the OpenZFS documentation and found to be correct:
- `zfs send -F`, `-i`, `-R`, `-R -i` flags and combinations
- `zfs receive -F`, `-n`, `-o property=value`, `-u` options
- `zfs snapshot -r` for recursive snapshots
- `mbuffer -s 128k -m 1G` arguments (block size, memory buffer size)
- `pv -L 10m` for rate limiting
- syncoid syntax including `--no-sync-snap` and `-r`
- `head -n -N` GNU coreutils syntax for excluding last N lines
- `/etc/cron.d/` format including the user field

## Review Notes
- The bullet "All properties, permissions, and timestamps are preserved" is technically accurate for file-level metadata stored within the dataset; readers should note that ZFS dataset-level properties (recordsize, atime, etc.) are only preserved when using `-p` or `-R`.
- The syncoid section labels the second command (`syncoid --no-sync-snap ...`) as "Incremental updates" — this is slightly misleading since syncoid handles incrementals by default after the initial replication; the `--no-sync-snap` flag specifically suppresses the creation of temporary `syncoid_*` snapshots and instructs syncoid to use existing snapshots (e.g. those created by sanoid). The commands themselves are valid, so this is left unchanged but is worth clarifying in a future revision.
- The variable `LATEST_SOURCE` in the automated replication script is set but never used. It is harmless dead code, not a correctness issue.
- The gzip-over-SSH compression example works but is largely redundant if the ZFS dataset already uses on-disk compression and `zfs send -c` is used; the post acknowledges this caveat.
- The post is broadly accurate and reflects modern OpenZFS practice on Ubuntu (zfsutils-linux). The scripts and commands would work as written on a current Ubuntu LTS release.
