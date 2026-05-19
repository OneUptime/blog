# Validation Summary: How to Monitor File System Usage with df and du on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `df` (GNU coreutils)
- `du` (GNU coreutils)
- `find`
- `ncdu`
- `tune2fs` (e2fsprogs)
- `awk`
- Bash scripting and cron
- Docker (`docker system df`, `docker ps -s`, `docker inspect`, `docker system prune`)
- systemd-coredump / `coredumpctl`
- APT package cache management

## Sources Consulted
- GNU coreutils `df` manual / `df --help` (Ubuntu 24.04)
- GNU coreutils `du` manual / `du --help` (Ubuntu 24.04)
- Docker CLI documentation for `docker inspect` (`-s/--size`) — https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI documentation for `docker system df` and `docker system prune`
- `ncdu` manual page
- `tune2fs(8)` manual
- `systemd-coredump(8)` and `coredumpctl(1)` manuals

## Issues Found

1. **`docker inspect $(docker ps -q)` — missing `--size` flag.** The `SizeRootFs` and `SizeRw` fields are not populated by `docker inspect` unless `--size` (`-s`) is passed. The Python snippet would have always printed `N/A`. Fixed by adding `--size` to the command and noting in the comment that this flag is what populates the size fields.

2. **`sudo journalctl --list-boots | xargs -I{} sudo journalctl -b {} | grep coredump` — broken pipeline.** `journalctl --list-boots` prints lines like `-1 abc123… Mon … — Mon …`; passing the full line to `journalctl -b {}` is invalid syntax (only an offset, ID, or empty arg is accepted). Replaced with `coredumpctl list`, the standard tool for enumerating coredumps captured by systemd-coredump.

## Review Notes

- The `df -h | awk 'NR>1 && $5+0 > THRESHOLD' …` script in the alerting section can produce misaligned columns when a device name is long enough that `df -h` wraps the row. For robust scripting, `df -P` (POSIX output) or `df --output=…` would prevent this, but the current script is fine for typical setups.
- `find /var -type f -size +100M 2>/dev/null -exec du -h {} \;` places the shell redirection in the middle of the `find` argument list. It still works because shell redirections are processed before the command runs, but stylistically `2>/dev/null` is usually placed at the end of the `find` invocation.
- The `find / -name "core" -o -name "core.*"` expression relies on `find` adding an implicit `-print` to the whole expression; this is correct for current `findutils`, but would behave differently if any explicit action were added later.
- `tune2fs -m 1 /dev/sda2` should only be applied to data partitions, never the root filesystem — the post already calls this out.
- `du -sx /*` in the Quick Reference will skip directories on other filesystems per path (e.g., `/dev`, `/proc`); this is the intended behavior of `-x` and is appropriate here.
