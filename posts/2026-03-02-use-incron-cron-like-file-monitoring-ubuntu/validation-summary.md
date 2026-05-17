# Validation Summary: How to Use incron for Cron-Like File Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- incron (incrond daemon, incrontab CLI) — Ubuntu package version 0.5.12-4
- Linux inotify subsystem
- systemd (service management)
- journald / syslog (log inspection)
- Bash shell scripting for incron-triggered commands
- ImageMagick `convert` (in the image-thumbnail example)

## Sources Consulted
- Ubuntu `incron` package metadata and file listing (apt-cache show / dpkg-deb -c on incron_0.5.12-4_amd64.deb)
- incrond(8) man page shipped with the Ubuntu package (`/usr/share/man/man8/incrond.8.gz`)
- incrontab(1) man page (`/usr/share/man/man1/incrontab.1.gz`)
- incrontab(5) man page (`/usr/share/man/man5/incrontab.5.gz`)
- incron.conf(5) example file (`/etc/incron.conf`) shipped with the package
- The systemd unit file shipped at `/lib/systemd/system/incron.service`
- Upstream project: https://github.com/ar-/incron

## Issues Found

1. **Wrong systemd unit name (`incrond` → `incron`)** — The post referenced `systemctl ... incrond` and `journalctl -u incrond` throughout. Inspecting the Ubuntu package shows the unit file is `/lib/systemd/system/incron.service`, so the correct unit name is `incron`. Fixed in the "Starting the incron Daemon", "Viewing incron Logs", and "Debugging incron" sections. (The binary remains `incrond`, so references to the daemon binary itself were left alone.)

2. **Invalid `incrond -n -f` flag combination** — The post recommended `sudo incrond -n -f` for "foreground with debug output". The incrond(8) man page shows `-f` takes a configuration file argument (`-f <FILE>` / `--config=<FILE>`), so `-n -f` with no argument is incorrect. The foreground/debug behavior comes from `-n` alone. Changed to `sudo incrond -n`.

3. **Outdated "no recursive watching" limitation** — The post claimed "incron does not support recursive directory watching. Each directory must be listed separately." The shipped incrontab(5) man page documents a `recursive=false` flag that *disables* recursion, which implies recursion is enabled by default in the current ar-/incron fork (the basis for Ubuntu 0.5.12). Updated the limitations section to reflect that recursive watching is supported, while keeping the (still accurate) note that each top-level path is listed separately. Also softened the follow-up sentence that recommended inotifywait specifically for recursive monitoring.

## Review Notes

- Special variables (`$$`, `$@`, `$#`, `$%`, `$&`) and the event list (`IN_ACCESS`, `IN_MODIFY`, `IN_ATTRIB`, `IN_CLOSE_WRITE`, `IN_CLOSE_NOWRITE`, `IN_OPEN`, `IN_MOVED_FROM`, `IN_MOVED_TO`, `IN_CREATE`, `IN_DELETE`, `IN_DELETE_SELF`, `IN_MOVE_SELF`, `IN_ALL_EVENTS`) all match incrontab(5) exactly.
- The `IN_CLOSE_WRITE` vs. `IN_MODIFY` guidance, the infinite-loop warning, and the `/bin/sh` execution context are all consistent with the source code and man pages.
- `/etc/incron.allow` / `/etc/incron.deny` semantics described in the post match the incrontab(1) man page. The Ubuntu package ships an empty `/etc/incron.allow`, which is why the post's "by default only root can use incron" statement holds — worth noting since on systems without the file the default is permissive.
- The "defaults to nano or whatever `$EDITOR` is set to" claim is slightly simplified; per incrontab(1) the actual selection order is `$EDITOR` → `$VISUAL` → config value → `/etc/alternatives/editor` → hard-wired `vim`. On a stock Ubuntu install `/etc/alternatives/editor` typically points to nano, so the user-visible behavior matches the post's description; left as-is for readability.
- The "Commands run under the user's shell environment, not a login shell" wording undersells what actually happens for non-root user tables: the environment is wiped and only `LOGNAME`, `USER`, `USERNAME`, `SHELL`, `HOME`, and a fixed `PATH` (`/usr/local/bin:/usr/bin:/bin:/usr/X11R6/bin`) are set. Worth tightening in a future revision but not technically wrong enough to flag.
- The post correctly notes that paths must exist when watches are added, that incron has no debouncing, and that inotify kernel limits (`fs.inotify.max_user_watches`) may need to be raised — all accurate.
