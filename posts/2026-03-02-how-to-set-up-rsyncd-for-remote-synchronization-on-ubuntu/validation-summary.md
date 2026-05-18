# Validation Summary: How to Set Up rsyncd for Remote Synchronization on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- rsync / rsyncd (rsync daemon)
- Ubuntu (apt, systemd, ufw)
- Bash scripting and cron
- SSH (for tunneling)
- POSIX file permissions

## Sources Consulted
- rsyncd.conf(5) man page (https://download.samba.org/pub/rsync/rsyncd.conf.5)
- rsync(1) man page (https://download.samba.org/pub/rsync/rsync.1)
- Ubuntu rsync package documentation (https://manpages.ubuntu.com/manpages/jammy/en/man5/rsyncd.conf.5.html)
- IANA Service Name and Transport Protocol Port Number Registry (port 873 / rsync)
- Bash Reference Manual — tilde expansion behavior (https://www.gnu.org/software/bash/manual/html_node/Tilde-Expansion.html)
- rsync exit codes (rsync(1) — exit code 24 = partial transfer due to vanished source files)

## Issues Found
1. **Misleading comment about bandwidth limiting** (Advanced Module Configuration → Read-Write Module): The line `# Bandwidth limit (KB/s per connection)` was placed above `transfer logging = yes`. The `transfer logging` directive controls per-file logging, not bandwidth, and rsyncd has no native bandwidth limit option. Updated the comment to accurately describe what `transfer logging = yes` does.
2. **Broken `--password-file=~/...` example** (Connecting to rsyncd from Clients): The example `rsync -avz --password-file=~/.rsync_password ...` does not work because bash does not perform tilde expansion in `--option=~/path` form when the option name is not a valid shell identifier (and rsync itself does not expand `~`). Changed to `--password-file="$HOME/.rsync_password"` and added a brief comment noting the limitation.

## Review Notes
- Port 873 for rsync daemon protocol is correctly stated (IANA-assigned).
- rsyncd.conf directives used (`uid`, `gid`, `use chroot`, `max connections`, `log file`, `log format`, `pid file`, `timeout`, `address`, `port`, `path`, `read only`, `list`, `auth users`, `secrets file`, `hosts allow`, `hosts deny`, `transfer logging`, `exclude`, `incoming chmod`) are all valid per the rsyncd.conf(5) man page.
- Log format codes (`%t %a %m %f %b`) are correct.
- The Ubuntu service unit is `rsync.service` (the post correctly handles the rsync vs rsyncd naming ambiguity with the `systemctl list-units | grep rsync` tip).
- Exit code 24 ("partial transfer due to vanished source files") is correctly documented.
- `incoming chmod = Dg+s,ug+rw,o=r` is valid syntax — `D` prefix targets directories only.
- The comment "# Run as a standalone daemon" sits next to `use chroot = yes`, where `use chroot` actually controls whether rsyncd chroots into the module path (not whether it runs standalone). Left unchanged because it reads as a section-level header rather than a strict directive description.
- The `chmod 755` permission comments ("read-write for auth users") could be clearer — writes succeed because the daemon runs as `nobody` (the directory owner), not because auth users have direct shell write access. Functionally correct, only the comment phrasing is loose.
- rsyncd is single-binary with rsync since rsync 2.x — no separate daemon package needed; this is correctly reflected.
