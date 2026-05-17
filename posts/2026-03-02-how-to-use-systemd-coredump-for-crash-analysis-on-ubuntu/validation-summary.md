# Validation Summary: How to Use systemd-coredump for Crash Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- systemd-coredump
- coredumpctl
- GDB (GNU Debugger)
- Ubuntu (apt, ddebs repository, apport)
- objcopy / strip (binutils)
- systemd unit files (LimitCORE)
- Linux kernel core_pattern mechanism
- C (sample crash program)

## Sources Consulted
- coredump.conf(5) — Ubuntu Noble manpages: https://manpages.ubuntu.com/manpages/noble/en/man5/coredump.conf.5.html
- coredumpctl(1) — Ubuntu Noble manpages: https://manpages.ubuntu.com/manpages/noble/en/man1/coredumpctl.1.html
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/latest/coredump.conf.html
- ArchWiki: Core dump — https://wiki.archlinux.org/title/Core_dump
- systemd PR #8207 (zstd compression support): https://github.com/systemd/systemd/pull/8207
- Ubuntu's `ubuntu-dbgsym-keyring` package and the `ddebs.ubuntu.com` debug-symbols repository documentation

## Issues Found

1. **Invalid `MaxRetentionSec` directive in `coredump.conf`** — The original post listed `MaxRetentionSec=1week` as a coredump.conf option. This is not a valid option per the coredump.conf(5) man page. Replaced with the actual valid `MaxUse=10G` option and added `KeepFree=1G` (both real, documented disk-space controls).

2. **Invalid `MaxCount` directive in `coredump.conf`** — The original post mentioned `MaxCount=100` (commented). This is also not a valid coredump.conf option. Removed entirely.

3. **Outdated compression algorithm comment** — The `Compress=yes` line was annotated as "xz compression". Modern systemd (since v247, ~2020) defaults to **zstd** when available. Updated the comment to "zstd by default on modern systemd".

4. **Incorrect description of the `Storage=` valid values** — The comment block listed `"store"` as a value. The actual valid values per the man page are `none`, `external`, and `journal`. Corrected the comment to reference `external` (which matches the value already used on the directive line).

5. **`coredumpctl info --debugger=gdb` is invalid usage** — Per the coredumpctl(1) man page, the `--debugger=` option only applies to the `debug` verb, not to `info`. Replaced with `coredumpctl info` (which already prints a stack trace inline from systemd-coredump's built-in unwinder) plus the existing `coredumpctl debug` example.

6. **systemd-coredump binary path** — The post referenced `/lib/systemd/systemd-coredump`. On modern Ubuntu (22.04+) with the /usr-merge, the canonical and displayed path in `core_pattern` is `/usr/lib/systemd/systemd-coredump`. Updated both occurrences (in the install/verify section and the troubleshooting section).

7. **Final summary sentence referenced the removed `MaxRetentionSec`** — Updated to point to the valid `MaxUse`, `KeepFree`, and `ExternalSizeMax` settings, plus a note that age-based retention is handled by `systemd-tmpfiles` via `/usr/lib/tmpfiles.d/systemd.conf` (default 3 days).

## Review Notes

- The `kill -SEGV $!` test against `sleep` is a real and common technique; it produces a core dump because the pipe-based `core_pattern` causes the kernel to invoke the helper regardless of the default RLIMIT_CORE. Left as-is.
- `systemctl daemon-reload` after editing `coredump.conf` is not strictly necessary — `systemd-coredump` reads its config when invoked per-dump — but the call is harmless and a reasonable habit. Left as-is.
- The Ubuntu debug-symbols (ddebs) setup using `ubuntu-dbgsym-keyring` is correct for current Ubuntu releases (20.04+).
- The `objcopy --only-keep-debug` / `strip` / `--add-gnu-debuglink` workflow is standard and accurate.
- `coredumpctl debug` and the deprecated alias `coredumpctl gdb` both still work; the post correctly uses the modern form.
- The compressed-dump file extensions in the cleanup section (`*.zst`, `*.lz4`) are accurate; `*.xz` could also occur on older systems but is uncommon now.
