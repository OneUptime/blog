# Validation Summary: How to Use rsync for Efficient File Transfers on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- rsync (verified against 3.2.7)
- SSH (as the transport for remote transfers)
- Bash scripting (backup scripts)
- cron (for scheduling)
- find / hard links (for snapshot-style backups)

## Sources Consulted
- `rsync --help` and `man rsync` on a system running rsync 3.2.7
- Official rsync project documentation (https://rsync.samba.org/)
- rsync man page section on exit codes and signal handling
- rsync man page entry for `--bwlimit`, `--link-dest`, `--files-from`, `--info=progress2`

## Issues Found
1. **Incorrect signal claim (`SIGUSR1`).** The post stated `kill -USR1 $(pgrep rsync)` would print "the current transfer status." This is wrong and actively dangerous: per the rsync man page, SIGUSR1 causes rsync to exit (exit code 20 — "Received SIGUSR1 or SIGINT"). A user following the original advice would terminate their in-flight transfer. Replaced the SIGUSR1 example with a note about using `--info=progress2` for new transfers, and kept the log-tail approach as the practical option for an already-running job.
2. **Non-existent option `--newer-mtime`.** The post showed `rsync -av --newer-mtime='2026-01-01' /source/ /dest/`. rsync 3.2.7 does not recognize this flag (`rsync: --newer-mtime=2026-01-01: unknown option`). Replaced the example with the standard approach: use `touch -d` to make a reference marker, `find -newer` to build the list of newer files, and pipe that to `rsync --files-from=-`.

## Review Notes
- The post says `--bwlimit` is specified in "KB/s". Strictly per the man page the default unit (with no suffix) is 1024 bytes (KiB/s). The shorthand is common in practice and the numeric examples (`5120` for "5 MB/s") are still correct, so left unchanged.
- The description of the rsync algorithm is a simplification (it actually uses rolling weak checksums plus stronger MD5/MD4 hashes per block on the receiver, sent back to the sender for diff computation) but is accurate at the level of detail this post targets.
- The `-a` / `--archive` expansion to `-rlptgoD` matches the current rsync man page.
- Exit code table is a correct subset of the full rsync exit-code list (codes 0, 1, 2, 11, 23, 24, 30, 35 all verified).
- The snapshot-with-hard-links pattern using `--link-dest=$LINK_DIR` correctly handles the first run too: if `$LINK_DIR` does not yet exist as a directory, `--link-dest` silently falls back to a full copy, so the script is safe to run on day one.
- `ls -la /proc/$(pgrep rsync)/fd` will fail if multiple rsync processes are running (since `pgrep` returns multiple PIDs). Acceptable for the example but worth flagging.
