# Validation Summary: How to Use dmesg to Read Kernel Messages on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `dmesg` (util-linux)
- Linux kernel ring buffer (`/dev/kmsg`)
- `journalctl` (systemd-journald)
- GRUB kernel command line (`log_buf_len`)
- `grep` patterns for kernel diagnostics (USB, disk/ATA, MCE/EDAC, OOM, PCIe/AER, segfaults, filesystems)

## Sources Consulted
- `dmesg(1)` man page (util-linux 2.39.3) — verified `-w`, `-T`, `-H`, `-x`, `-L`, `-l/--level`, `-f/--facility`, `-c/--read-clear`, `-s/--buffer-size`, `-k`, and the COLORS section
- `journalctl(1)` — verified `-b`, `-k/--dmesg`, `--since`
- Linux kernel documentation for `log_buf_len` boot parameter (`Documentation/admin-guide/kernel-parameters.txt`)
- Verified runtime behavior of `dmesg --buffer-size` (errors without an argument)

## Issues Found
1. **`dmesg -Tx` described as adding color** — The combined flags comment said "human time, color, and level names", but neither `-T` (ctime) nor `-x` (decode) enables colorization. To get color you need `-L`/`--color` or `-H`/`--human`. Updated the comment to "human time and level names" and added a follow-up `dmesg -TxL` example for the color case.

2. **`dmesg --buffer-size` shown as a way to check the current ring buffer size** — This is incorrect. `-s, --buffer-size size` requires a size argument and controls the buffer dmesg allocates to *read from* the kernel ring buffer; it does not report the kernel's ring buffer size. Running it without an argument errors out (`option '--buffer-size' requires an argument`). Replaced with `dmesg | grep -i "log_buf_len"`, which surfaces the early-boot kernel message that prints the configured buffer size.

## Review Notes
- The `-c` example is labelled "Clear dmesg" but `-c`/`--read-clear` prints the buffer first and then clears it. The side-effect (clearing) is correct for the stated use case, so left as-is.
- The `-T` caveat about timestamp drift after SUSPEND/RESUME is correctly noted in the post (the man page calls this out explicitly).
- The example "renamed from eth0 to ens3" line is illustrative; the actual rename event is typically logged via udevd, not the kernel itself, but the example is clearly synthetic and used only to show interface naming transitions.
- The kernel log severity table (0–7) matches the standard syslog priority levels.
- Severity filter shorthand `--level=err+` (plus suffix to include higher severities) is supported by modern util-linux but not mentioned; the explicit comma-separated form used in the post is fully correct.
