# Validation Summary: How to Understand Kernel Ring Buffer and dmesg on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel ring buffer
- `dmesg` (util-linux)
- `journalctl` / systemd-journald
- `printk` and `/proc/sys/kernel/printk`
- `/etc/systemd/journald.conf` configuration
- GRUB kernel command-line parameters (`log_buf_len`)
- `smartctl` (referenced briefly)

## Sources Consulted
- `man dmesg` (util-linux) — verified flag meanings (`-S`, `-s`, `-t`, `-T`, `-w`, `-W`, `-c`, `-C`, `-f`, `-l`)
- Linux kernel admin-guide: `Documentation/admin-guide/sysctl/kernel.rst` (printk fields, `printk_devkmsg`)
- `journalctl(1)` man page (`-k`, `-b`, `-p`, `--since`, `-f`, `--list-boots`, `-o short-precise`)
- `systemd-journald.conf(5)` (`Storage`, `SystemMaxUse`, `SystemKeepFree`, `MaxRetentionSec`)
- `systemd-tmpfiles(8)` (`--create --prefix`)
- Live verification of `/proc/sys/kernel/printk_devkmsg` and `/proc/sys/kernel/printk` on the host

## Issues Found

1. **`dmesg -S` mislabelled as "check ring buffer size"** (two occurrences). `-S` / `--syslog` forces dmesg to use the `syslog(2)` interface instead of `/dev/kmsg`; it has nothing to do with reporting buffer size. Replaced with `dmesg | grep -i "log_buf"` and a check of `/proc/cmdline` for an overridden `log_buf_len`.

2. **`cat /proc/sys/kernel/printk_devkmsg` mislabelled as ring buffer size.** That sysctl controls the behavior of userspace writes to `/dev/kmsg` (values: `ratelimit`, `on`, `off`) — not a buffer size. Removed from both "Check ring buffer size" snippets.

3. **`dmesg -t` described as "relative timestamps (seconds since boot)".** `-t` / `--notime` actually *suppresses* timestamps. The default `dmesg` invocation is the one that shows relative `[seconds.microseconds]` timestamps. Rewrote the snippet so the default behavior is shown for relative timestamps and `-t` is correctly shown as suppressing them.

4. **`dmesg -W` paired with `--follow`.** `-W` is `--follow-new` (prints only newly arriving messages), while `-w` is `--follow` (prints backlog and then follows). The "like `tail -f`" example needed `-w`; added a separate snippet for `-W` showing only new messages.

5. **Misleading comment on `dmesg -c`** ("just clear (but still shows new messages)"). `-c` / `--read-clear` first prints the current buffer contents and then clears — corrected the comment.

## Review Notes

- The "current default minimum boot-time" labels for the four `/proc/sys/kernel/printk` fields are slightly informal — the kernel's own naming is `console_loglevel`, `default_message_loglevel`, `minimum_console_loglevel`, `default_console_loglevel`. The shorthand is acceptable and matches widely used documentation, so left as-is.
- The "typically 512KB to 4MB" range for the ring buffer is reasonable for modern Ubuntu kernels once per-CPU contributions (`CONFIG_LOG_CPU_MAX_BUF_SHIFT`) are factored in; left as-is.
- The example string `"Out of memory"` for grepping OOM events is reasonable; the actual kernel emits `Out of memory: Killed process …`, so the grep works.
- The example facility list (`kern, user, mail, daemon, syslog, lpr, news`) is correct; `auth` is also commonly listed but omitting it is not an error.
- The `journalctl --list-boots`, `-b -1`, `-k -f`, `-p err`, and `--since` examples all match current systemd behavior.
