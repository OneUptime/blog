# Validation Summary: How to Monitor IPv6 Mail Server Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- Postfix (mail server)
- SMTP / IMAPS (ports 25 / 993)
- `nc` (netcat) for connectivity checks
- `postqueue` / `mailq` for Postfix queue inspection
- `dig` for DNS / PTR / FCrDNS verification
- Prometheus + kumina/postfix_exporter
- systemd unit files
- Bash shell scripting
- OneUptime TCP / SMTP monitors

## Sources Consulted
- kumina/postfix_exporter source (master branch) — `main.go`, `logsource_file.go`: https://github.com/kumina/postfix_exporter
- kumina/postfix_exporter releases API: https://api.github.com/repos/kumina/postfix_exporter/releases
- Postfix `postqueue(1)` man page (queue status markers `*`, `!`, blank)
- Postfix `postconf(5)` — `enable_long_queue_ids` and the long queue ID character set documentation
- Postfix `QSHAPE_README` for queue layout (`/var/spool/postfix/deferred`)
- `nc` (ncat / netcat-openbsd) man pages for `-6`, `-z`, `-w` flags
- `dig` man page for `-x` reverse lookup and `+short` output

## Issues Found

1. **Section 2 — `grep "Deferred"` against `postqueue -p` output.** The `postqueue -p` / `mailq` output does not contain the literal word "Deferred" anywhere. Postfix uses single-character status suffixes on the queue ID column (`*` = active, `!` = held, blank = deferred). The original `DEFERRED=$(postqueue -p ... | grep "Deferred" ...)` would always return 0. Replaced with a count of files in `/var/spool/postfix/deferred`, which is the authoritative deferred queue location per `QSHAPE_README`.

2. **Section 2 — queue ID regex `^[0-9A-F]`.** This only matches Postfix's short queue IDs. When `enable_long_queue_ids = yes` (default since Postfix 3.0), queue IDs use a base-52 alphabet of consonants + digits (vowels excluded), so the regex misses the majority of modern queue IDs. Updated to `^[A-Za-z0-9]`, which matches both formats while still excluding the header (`-Queue ID-`) and footer (`-- N Kbytes in M Request(s).`) lines that begin with `-`.

3. **Section 4 — invalid postfix_exporter download URL.** The post referenced `releases/download/v0.3.0/postfix_exporter_0.3.0_linux_amd64.tar.gz`. Verified via the GitHub releases API that (a) the tag is `0.3.0`, not `v0.3.0`, and (b) the `0.3.0` release ships **no binary release assets** — only `0.2.0` ships a binary, and even then it's a bare `postfix_exporter` file, not a `*.tar.gz`. The `wget`/`tar` sequence as written would 404. Replaced with a `git clone` + `go build` source build, which works against the current `master` / `0.3.0` source.

4. **Section 4 — wrong flag name `--postfix.logfile-path`.** Verified against `logsource_file.go` on `master` that the actual kingpin flag is `--postfix.logfile_path` (underscore between `logfile` and `path`, not a dash). Other related flags follow the same underscore convention (`--postfix.showq_path`, `--postfix.systemd_unit`). Corrected.

## Review Notes
- `--web.listen-address`, `--web.telemetry-path`, `nc -6 -z -w 5`, `dig -x`, `dig AAAA +short`, port 25 (SMTP), and port 993 (IMAPS) all verified correct.
- The IPv6-vs-IPv4 detection in Section 3 (`grep -E "relay=.*\[.*:.*\]"`) is a reasonable heuristic since Postfix log lines render IPv6 relay addresses as `relay=host[2001:db8::1]:25`, which contains a colon inside square brackets, while IPv4 (`relay=host[192.0.2.1]:25`) does not.
- kumina/postfix_exporter has not had a release since `0.3.0` (2021-10-20). Users adopting this exporter today should be aware it is effectively unmaintained; a future revision of the post could mention an alternative such as the systemd-journal-driven build mode if Postfix is logging to journald.
- `timeout 10` wrapped around `nc -w 5` is mildly redundant (the inner `-w 5` already enforces a 5-second connection timeout) but harmless — left as written since the author's intent (a hard outer cap) is reasonable.
- The `postqueue -p | head -20` line in Section 2 prints the header and the first few queue entries; this is fine for ad-hoc inspection, just noting that `head -20` does not necessarily show the *oldest* messages — Postfix queue ordering is by queue ID (timestamp-derived), so it generally does, but this isn't guaranteed across hash directories.
