# Validation Summary: How to Set Up Structured Logging with journald on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- systemd-journald (systemd 255+ on Ubuntu)
- journalctl CLI
- journald.conf configuration
- systemd-cat
- logger (util-linux) with --journald
- python3-systemd (systemd.journal.send)
- systemd-tmpfiles
- systemd-journal-remote
- cron.daily for scheduled log analysis

## Sources Consulted
- journalctl(1) man page (systemd 255) — flags, output modes, filtering, --field/--fields semantics
- journald.conf(5) man page — Storage=, SystemMaxUse, SystemKeepFree, drop-in directory semantics, ForwardTo* options, RateLimit* options
- systemd-cat(1) man page — confirms it only logs lines as MESSAGE entries and does not parse structured key=value input
- logger(1) man page (util-linux) — --journald input format and notes that -t/-p are ignored when --journald is used
- systemd-analyze(1) — cat-config subcommand for showing effective configuration
- systemd.journal-fields(7) — well-known journal fields (_SYSTEMD_UNIT, _PID, _UID, _COMM, SYSLOG_IDENTIFIER, PRIORITY, MESSAGE)
- systemd-journal-remote(8) — required to import export-format streams back into native journal files
- Verified against the installed systemd 255 (255.4-1ubuntu8.14) on the review system

## Issues Found

1. **`journalctl --show-config` does not exist.** The post used `sudo journalctl --show-config 2>/dev/null || cat /etc/systemd/journald.conf` to view the effective configuration. There is no `--show-config` flag on journalctl (any systemd version, including 255). Replaced with `sudo systemd-analyze cat-config systemd/journald.conf`, which is the documented way to render the merged main file plus drop-ins.

2. **Wrong description of `-F _SYSTEMD_UNIT`.** The comment claimed the command "lists all unique field names ever seen in the journal." The `-F FIELD` flag actually lists all unique *values* of the specified field. The flag for listing field *names* is `-N`. Split the snippet into two commands: one using `-N` for field names and one using `-F` for unique values, with corrected comments.

3. **Misleading comment about `/etc/systemd/journald.conf.d/`.** The post described this directory as "per-user journal configuration." Per journald.conf(5), it is the drop-in configuration directory for the system journald instance — not per-user. Per-user journals are managed automatically; they are not configured via this directory. Updated the comment to "drop-in configuration snippets that override the main file."

4. **`journalctl --file /tmp/nginx-logs.export` would not work.** The `--export` output format is a binary stream meant for backup/transport, not a native journal file, and `--file=` requires native journal files. Per journalctl(1), the way to read an export-format stream back is to convert it with `systemd-journal-remote` first. Updated the snippet to do exactly that.

5. **`journal_log` shell function did not produce structured entries.** The original piped lines like `PRIORITY=6\nMESSAGE=...\nFIELD=...` into `systemd-cat`. Per systemd-cat(1), each stdin line is logged as a separate entry's MESSAGE field — it does not parse key=value pairs. The function thus produced multiple text entries, not one structured entry. Replaced the implementation to pipe the same key=value lines into `logger --journald`, which is the documented mechanism for emitting structured entries from shell. Added a clarifying sentence above the snippet noting the systemd-cat limitation.

6. **`logger -t myapp --journald` had no effect for the tag.** Per logger(1), when `--journald` is used, `-t` and `-p` (and other options) are ignored — the identifier and priority must be supplied as `SYSLOG_IDENTIFIER=` and `PRIORITY=` fields in the input. Dropped `-t myapp` from the command and added `SYSLOG_IDENTIFIER=myapp` plus a `PRIORITY=3` line into the heredoc, with an inline comment explaining the gotcha.

## Review Notes

- The priority range example `journalctl -p warning..info` is syntactically valid and matches priorities 4–6 (warning, notice, info). Readers should note this excludes errors (priority 3) and below; the post does not call this out, but the example itself is correct.
- The `for p in emerg alert crit ... ; do journalctl -p "$p..$p" ... | wc -l; done` loop in the daily summary script counts output *lines*, not entries. In the default `short` format with single-line MESSAGE fields this approximates entry count, but multi-line MESSAGE values will inflate the counts. Acceptable for a rough daily summary; not changed.
- The post assumes `python3-systemd` is installed for the `from systemd.journal import send` example. On Ubuntu the package is `python3-systemd` and is not installed by default. Worth being aware of, but not a technical error.
- `SystemMaxUse=` default ("10% of filesystem, capped at 4G") matches the journald.conf(5) man page.
- `RateLimitIntervalSec=` and `RateLimitBurst=` are the current option names in systemd 255 and accept the values shown.
