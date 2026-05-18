# Validation Summary: How to Set Up inotifywait for File-Based Triggers on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel inotify subsystem
- inotify-tools (`inotifywait`, `inotifywatch`)
- Ubuntu / `apt` package management
- Bash scripting (read loops, arrays, debounce, `--format`, `--exclude`)
- systemd unit files
- `/proc/sys/fs/inotify/*` sysctl tunables (`max_user_watches`, `max_user_instances`)
- Auxiliary tools: `nginx -t`, `systemctl`, `stat`, `mail`, `logger`

## Sources Consulted
- inotify-tools project / man pages: https://github.com/inotify-tools/inotify-tools
- `inotifywait(1)` man page (events list, `-m`, `-r`, `-e`, `--format`, `--exclude`, `-v` semantics)
- Linux kernel `inotify(7)` man page: https://man7.org/linux/man-pages/man7/inotify.7.html
- Linux kernel documentation on `/proc/sys/fs/inotify/` tunables (`max_user_watches`, `max_user_instances`)
- Ubuntu `inotify-tools` package documentation: https://packages.ubuntu.com/jammy/inotify-tools
- systemd.unit / systemd.service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- nginx documentation for `nginx -t` and `systemctl reload nginx`

## Issues Found
1. **Incorrect command for counting active inotify watches.** In the "Checking inotify Limits" section, the final command was labeled as checking the number of currently active watches but actually re-read the limit file (`/proc/sys/fs/inotify/max_user_watches`), which only shows the configured maximum. Replaced it with a command that sums the actual watch descriptors reported by `/proc/*/fdinfo/*` (`grep -c '^inotify wd'`) — this correctly returns the count of active inotify watches across all processes.

## Review Notes
- Event list in "Available Events" matches `inotifywait(1)` and `inotify(7)`. It is not exhaustive (e.g. `close`, `move_self`, `isdir` are also valid) but the omissions are not errors.
- The default value shown for `fs.inotify.max_user_watches` (8192) is the historic Linux kernel default and remains a commonly observed value, though some distributions (and recent Ubuntu releases shipping `/etc/sysctl.d/` overrides for tools like VS Code) ship higher defaults (e.g. 65536 or 524288). Users should treat the number as illustrative and `cat` the file on their own system to confirm.
- The systemd unit's `Wants=network.target` is redundant alongside `After=network.target` (no `Requires=`) but is not incorrect.
- The `read -r directory events filename` pattern in the nginx-config-watch script works for directory watches (where inotifywait emits `<dir> <events> <filename>`). When watching a single file argument, inotifywait emits `<path> <events>` with no trailing filename — the loop still works because `$directory$filename` reduces to the path, but it's worth being aware of.
- The debounce in the build-trigger script only suppresses rebuilds *triggered* within the window; events that occur during a rebuild may still queue up behind it. This is acceptable for a small example but real-world build watchers often need a trailing-edge debounce.
- `--exclude` accepts POSIX extended regex; the supplied pattern `'\.git|node_modules|__pycache__|\.pyc$'` parses correctly.
- The troubleshooting note that NFS and many network filesystems do not deliver inotify events for remote-side changes is accurate.
