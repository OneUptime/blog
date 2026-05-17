# Validation Summary: How to Set Up inotifywait for File Change Detection on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- inotify-tools (`inotifywait`, `inotifywatch`)
- Linux kernel inotify subsystem
- Ubuntu (apt package management)
- systemd unit files
- nginx (as a config-reload example)
- rsync (as a file-sync example)
- sysctl / `/proc/sys/fs/inotify/*` tunables
- Bash scripting (read loops, debouncing, logger)

## Sources Consulted
- inotifywait(1) man page — https://man7.org/linux/man-pages/man1/inotifywait.1.html
- inotifywatch(1) man page — https://man7.org/linux/man-pages/man1/inotifywatch.1.html
- inotify(7) kernel API man page — https://man7.org/linux/man-pages/man7/inotify.7.html
- inotify-tools project wiki — https://github.com/inotify-tools/inotify-tools/wiki
- Ubuntu 24.04 package metadata for `inotify-tools 3.22.6.0-4` (verified `--include`/`--includei` availability)
- inotify-tools issue tracker (issue #168 referencing `--include` in 3.22.6.0)

## Issues Found
1. **Timefmt/read field mismatch in the nginx auto-reload script.** The original `--timefmt '%Y-%m-%d %H:%M:%S'` contains a space, so `%T` expands to two whitespace-separated tokens. Combined with `--format '%T %w %f %e'`, the output produces 5 tokens, but the consuming loop `while read DATETIME DIRECTORY FILE EVENT` has only 4 variables. This causes misassignment: `DATETIME` gets only the date, `DIRECTORY` gets the time, `FILE` gets the watched directory path, and `EVENT` ends up with the filename plus event name concatenated. Fixed by changing the timefmt to `'%Y-%m-%dT%H:%M:%S'` (ISO 8601), matching the format already used in the sensitive-files watcher later in the same post and producing a single whitespace-free token for `%T`.

## Review Notes
- The `--include` flag used in the build watcher script is valid and present in inotify-tools 3.20.2 and later. Ubuntu 22.04 and 24.04 both ship 3.22.6.x, so this works on supported Ubuntu releases. Users on Ubuntu 20.04 (3.20.1) would not have `--include`; not worth calling out in the post.
- The event list is correct and matches the man page. The post omits the convenience aliases `close` and `move` and the `unmount` event, but the listed twelve are all valid.
- The race-condition example `inotifywait -m -e create /watch/dir | while read DIR EVENT FILE` relies on the default output format (`WATCHED EVENTS FILENAME`), which is correct.
- Filenames containing spaces would still break the shell `read` parsing in several scripts, but the affected paths (`/etc/nginx`, `/etc/passwd`, etc.) don't normally contain spaces, so this is acceptable for the examples shown.
- The `LAST_BUILD` variable in the build-watcher's `while read` loop runs in a subshell because of the pipe, so it only persists for the duration of that subshell — which is fine here because all iterations share the same subshell. Worth noting if anyone tries to read `LAST_BUILD` after the loop, but the example never does.
