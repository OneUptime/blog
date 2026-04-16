# Validation Summary: How to Install ClickHouse on FreeBSD

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse (OLAP database)
- FreeBSD (operating system)
- FreeBSD `pkg` and Ports Collection
- FreeBSD `rc.d` service framework
- FreeBSD Linux compatibility layer (`linux64` kernel module, `linux_base-*`)
- `brandelf`, `kldload`, `sysrc`, `fetch`, `service` utilities
- ZFS (dataset tuning: `compression=lz4`, `atime=off`, `recordsize=1M`)
- FreeBSD sysctl kernel tuning
- `pf` packet filter

## Sources Consulted
- [FreshPorts — databases/clickhouse](https://www.freshports.org/databases/clickhouse) — confirmed the port exists, is actively maintained by Kurt Jaeger (pi@FreeBSD.org), and supports amd64/aarch64 on FreeBSD 13–16.
- [FreeBSD Ports Tree (cgit) — databases/clickhouse](https://cgit.freebsd.org/ports/tree/databases/clickhouse/) — confirmed upstream ports origin.
- [FreeBSD Forums — Recommended usage of git instead of portsnap](https://forums.freebsd.org/threads/recommended-usage-of-git-instead-of-portsnap.93822/) and [HEADS UP: Planned deprecation of portsnap](https://lists.freebsd.org/pipermail/freebsd-ports/2020-August/119098.html) — confirmed portsnap was removed from the FreeBSD 14 base system and the recommended replacement is `git clone https://git.FreeBSD.org/ports.git /usr/ports`.
- [FreshPorts — emulators/linux_base-rl9](https://www.freshports.org/emulators/linux_base-rl9/) and [FreeBSD Forums — Migration from linux-c6 to linux-rl9](https://forums.freebsd.org/threads/migration-from-linux-c6-to-linux-rl9.98523/) — confirmed `LINUX_DEFAULT` was switched to `rl9` (Rocky Linux 9) and `linux_base-c7` is marked DEPRECATED following CentOS 7 EOL (2024-06-30).
- [FreeBSD Handbook — Chapter 12. Linux Binary Compatibility](https://docs.freebsd.org/en/books/handbook/linuxemu/) — verified `kldload linux64`, `sysrc linux_enable="YES"`, and `brandelf -t Linux` usage.
- ClickHouse master binary URL `https://builds.clickhouse.com/master/amd64/clickhouse` — confirmed as the official precompiled Linux x86_64 master build path.

## Issues Found
1. **Outdated ports update command.** The post used `portsnap fetch update` to update the ports tree. `portsnap(8)` was removed from the FreeBSD base system in FreeBSD 14.0 and users are expected to use git to fetch/update ports. Replaced with `pkg install -y git` followed by `git clone https://git.FreeBSD.org/ports.git /usr/ports`, noting the reason in a comment.
2. **Deprecated Linux base package.** The post instructed the reader to `pkg install linux_base-c7`. CentOS 7 is past its EOL (2024-06-30) and the FreeBSD `linux_base-c7` port is marked DEPRECATED; the current `LINUX_DEFAULT` is `rl9` (Rocky Linux 9). Updated the command to `pkg install linux_base-rl9` with an inline comment explaining the change.

## Review Notes
- The `databases/clickhouse` port genuinely exists and is actively maintained (most recent update observed: v25.11.1.558, 2025-12-02), so the post's `pkg install databases/clickhouse` and `cd /usr/ports/databases/clickhouse && make install clean` instructions are valid. The author's hedging ("Availability may vary by FreeBSD version…") is appropriate.
- The rc.d script uses standard FreeBSD conventions (`PROVIDE`, `REQUIRE: NETWORKING`, `KEYWORD: shutdown`, `rc.subr`, `load_rc_config`, `run_rc_command`). `clickhouse-server --daemon --config-file=... --pid-file=...` are valid flags. Note: the script declares `clickhouse_user`/`clickhouse_group` but does not actually use them to drop privileges (no `command_user`/`pidfile`/`su_cmd` wiring). This is a functional caveat rather than a factual error — out of scope for a pure technical-accuracy review.
- `brandelf -t Linux` is generally unnecessary on modern FreeBSD since the Linuxulator autodetects ELF note sections, but the command is harmless and still documented in the Handbook, so this is not a correctness issue.
- `kldload linux64` loads the 64-bit Linuxulator module on amd64; `linux_common.ko` will be pulled in automatically. Running `service linux onestart` is an equivalent modern alternative, but the author's approach is valid.
- The ZFS dataset tuning (`compression=lz4`, `atime=off`, `recordsize=1M`) and sysctl tuning values are sensible defaults for a ClickHouse workload on FreeBSD/ZFS.
- `pf` rules are syntactically valid; the author correctly uses `proto tcp`, interface names, CIDR sources, and port lists in braces.
