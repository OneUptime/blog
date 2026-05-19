# Validation Summary: How to Set Up Cross-Site Backup Replication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- rsync (with options: --archive, --compress, --checksum, --delete, --delete-delay, --partial, --partial-dir, --progress, --stats, --log-file, --rsh, --bwlimit, --link-dest, --dry-run)
- OpenSSH (ssh-keygen, ssh-copy-id, authorized_keys command= restrictions)
- rrsync (restricted rsync wrapper shipped with rsync)
- systemd (.service and .timer units, OnCalendar, RandomizedDelaySec, Persistent)
- Bash scripting (trap, lock files, $?, stat)
- ionice / nice (I/O and CPU priority)
- mail command (alerting)
- Ubuntu Linux

## Sources Consulted
- rsync man page / official documentation (https://download.samba.org/pub/rsync/rsync.1)
- OpenSSH sshd authorized_keys documentation (https://man.openbsd.org/sshd.8)
- ssh-copy-id man page
- systemd.timer documentation (https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
- systemd.time documentation (https://www.freedesktop.org/software/systemd/man/systemd.time.html)
- ionice(1) and nice(1) man pages
- stat(1) coreutils documentation
- ln(1) coreutils documentation
- rrsync script documentation (part of rsync source distribution)

## Issues Found
No technical issues found.

## Review Notes
- `--bwlimit=10240` defaults to KiB/s, which equals ~10 MiB/s (≈10.485 MB/s). The "10 MB/s" comment is approximate but within the typical tolerance used in this context. Modern rsync also accepts suffixes like `10M` for clarity.
- The `command="rrsync /backups/"` restriction assumes `rrsync` is on the secondary's PATH. On Ubuntu 22.04+ rrsync is shipped at `/usr/bin/rrsync` by default; on older Ubuntu it lived under `/usr/share/doc/rsync/scripts/rrsync` (sometimes gzipped) and had to be installed manually. Worth noting for older systems but not strictly incorrect.
- `StrictHostKeyChecking=yes` requires the secondary's host key to already exist in `~/.ssh/known_hosts`. For unattended first runs, operators may want to seed `known_hosts` manually or use `accept-new` on the very first run. This is a reasonable security default though.
- `/var/run` is a tmpfs symlink to `/run` on modern Ubuntu; the lock file there is cleared on reboot, which is generally desirable for stale-lock cleanup.
- The bandwidth section mentions cpulimit but only demonstrates `ionice` and `nice`. Minor stylistic note, not a technical error.
- `touch /backups/.last-replication-success` is described as something to add to the script "after successful rsync"; the example script in §"Basic Replication with rsync" does not include this line explicitly. Readers following the post sequentially will need to add it themselves, which the post does instruct them to do.
- The `command=` in authorized_keys uses `rrsync` in restricted (write) mode by default; a `-ro` flag would be appropriate if the secondary should only receive (it does receive here, so the default is fine).
