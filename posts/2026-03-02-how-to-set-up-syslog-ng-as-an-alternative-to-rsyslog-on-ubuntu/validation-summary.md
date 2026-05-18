# Validation Summary: How to Set Up Syslog-NG as an Alternative to rsyslog on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- syslog-ng (Open Source Edition 4.x)
- rsyslog (for comparison)
- Ubuntu
- systemd / systemd-journald
- Syslog protocol (RFC 3164, RFC 5424)
- TLS-encrypted log forwarding
- JSON and CSV parsing

## Sources Consulted
- syslog-ng OSE admin guide — Global options: https://syslog-ng.github.io/admin-guide/090_Global_options/000_Global_options.html
- syslog-ng OSE admin guide — file() source options: https://syslog-ng.github.io/admin-guide/060_Sources/020_File/000_File_source_options.html
- syslog-ng OSE admin guide — disk-based and memory buffering: https://syslog-ng.github.io/admin-guide/080_Log/020_Buffering/README.html
- syslog-ng OSE admin guide — Log path flags: https://syslog-ng.github.io/admin-guide/080_Log/000_Log_paths/003_Log_path_flags.html
- syslog-ng OSE admin guide — Configuration syntax: https://syslog-ng.github.io/admin-guide/050_The_configuration_file/001_Configuration_syntax.html
- syslog-ng blog — `@version` backward compatibility: https://www.syslog-ng.com/community/b/blog/posts/backward-compatibility-in-syslog-ng-by-using-the-version-number-in-syslog-ng-conf
- Ubuntu package archive for syslog-ng

## Issues Found

1. **Incorrect driver for kernel source** — The post had `source s_kernel { unix-dgram("/dev/kmsg"); };`. `/dev/kmsg` is a character device, not a Unix-domain datagram socket, so `unix-dgram()` is the wrong driver. Changed to `file("/proc/kmsg" program-override("kernel"));`, which is the documented way to read kernel messages in syslog-ng. (The `system()` source already used in `s_local` also handles this automatically.)

2. **Misleading comment on `log_msg_size()`** — The comment said "Default log level". `log_msg_size()` is actually the maximum size (in bytes) of an incoming log message. Updated the comment accordingly.

3. **Misleading comment on `time_reopen()`** — The comment said "How long to wait before creating a new log file". `time_reopen()` is actually the number of seconds to wait before reconnecting to a failed destination. Updated the comment.

4. **Wrong disk-buffer option with `reliable(yes)`** — The post used `mem-buf-length(10000)` together with `reliable(yes)`. Per the official docs, `mem-buf-length()` is for `reliable(no)` (counts messages); when `reliable(yes)` is set, you must use `mem-buf-size()` (size in bytes). Changed to `mem-buf-size(10485760)` and updated the comment.

## Review Notes

- `@version: 4.0` matches syslog-ng OSE 4.x, which ships in Ubuntu 24.04. Older Ubuntu LTS releases (22.04 and earlier) ship syslog-ng 3.x and would require a `@version: 3.x` declaration matching the installed version. The post does not call out the Ubuntu version this targets — readers on 22.04 may hit a version mismatch warning. Not a hard error, just worth noting in a future revision.
- The `systemd-journal()` source appears twice (in the base config as `s_systemd` and again in `journald.conf` as `s_journald`). Both blocks are syntactically valid in isolation but using both in one running config would attempt to open the journal reader twice. The author appears to intend them as alternatives rather than additive — readers should pick one.
- `flags(final)` only short-circuits further top-level log paths, not embedded ones — this is consistent with how the post uses it.
- The `message("^\{")` regex in the JSON-parsing example unnecessarily escapes `{` (it isn't a metacharacter outside a quantifier), but it still matches correctly.
- The vs-rsyslog comparison table's "Premium features" row is editorialized but factually defensible: rsyslog is fully open source, while syslog-ng has both OSE and a commercial Premium Edition (PE).
