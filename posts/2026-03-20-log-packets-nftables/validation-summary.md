# Validation Summary: How to Log Packets with nftables

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- Linux kernel logging
- `dmesg`
- `journald` / `journalctl`
- rsyslog

## Sources Consulted
- nftables wiki, "Logging traffic": https://wiki.nftables.org/wiki-nftables/index.php/Logging_traffic
- nftables official man page: https://netfilter.org/projects/nftables/manpage.html
- systemd `journalctl` documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Linux kernel documentation, "Message logging with printk": https://www.kernel.org/doc/html/next/core-api/printk-basics.html
- rsyslog documentation, "Filter Conditions": https://docs.rsyslog.com/doc/configuration/filters.html
- Local CLI help used for command verification: `nft --help`, `journalctl --help`, `dmesg --help`

## Issues Found
- The mixed log-flags example used invalid nftables syntax: `flags tcp options,ip options`. I changed it to `flags tcp options flags ip options`, which matches documented nftables log-flag syntax and parses correctly.
- The `journalctl` example grepped for `nft`, which would not reliably match the configured log messages. I changed it to grep for `INPUT DROP`, which matches the prefix used earlier in the post.
- The section titled "Log to a Specific Syslog Group" described nftables `group` incorrectly. In nftables, `group` is an NFLOG group for userspace consumers such as `ulogd`, not a syslog routing group. I replaced that guidance with the correct prefix-based syslog routing approach that matches the rsyslog snippet already shown.
- The rule in that same section placed `drop` before `log`. Because nftables evaluates rule statements left to right, that ordering would prevent the logging action from being useful. I changed the rule to log before the terminal verdict.
- The prerequisites implied nftables needed to be "running". I corrected that wording and added a short clarification that the one-line `nft add rule ...` examples assume an existing `inet filter` table and `input` chain unless the reader uses the full ruleset example below.

## Review Notes
- NFLOG via `group` is still a valid nftables logging workflow, but it requires a userspace consumer and is separate from routing kernel log messages through syslog.
