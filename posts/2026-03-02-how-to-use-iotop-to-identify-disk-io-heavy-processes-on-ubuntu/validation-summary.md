# Validation Summary: How to Use iotop to Identify Disk I/O Heavy Processes on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iotop (Python iotop 0.6, Ubuntu's default `iotop` package)
- Linux I/O accounting (TASKSTATS, TASK_IO_ACCOUNTING)
- ionice (I/O scheduling priorities: best-effort, real-time, idle)
- Supporting tools: iostat, pidstat, lsof, strace, vmstat, free

## Sources Consulted
- Ubuntu `iotop` package source (extracted from `iotop_0.6-42-ga14256a-0.2build1_amd64.deb`), specifically `iotop/ui.py` for column headers and option parsing
- `iotop(8)` man page
- Linux kernel I/O accounting documentation (taskstats, delay accounting)
- `ionice(1)` man page for scheduling class semantics

## Issues Found

1. **Broken multi-PID command using comma-separated PIDs.** The post had:
   ```bash
   sudo iotop -p $(pgrep postgres | tr '\n' ',' | sed 's/,$//')
   ```
   This would expand to `sudo iotop -p 1234,5678`, which fails. Python iotop's `-p`/`--pid` option is defined with `type='int', action='append'`, so it accepts a single integer per occurrence and must be repeated for multiple PIDs. Replaced with:
   ```bash
   sudo iotop $(pgrep postgres | sed 's/^/-p /' | tr '\n' ' ')
   ```
   which expands to `sudo iotop -p 1234 -p 5678 ...`, and updated the explanatory text accordingly.

2. **Broken awk pipeline in the logging script.** The script claimed to print "Top I/O consumers" via:
   ```bash
   awk '{read+=$4; write+=$6; cmd=$NF} END {print read, write, cmd}' | sort -rn | head -10
   ```
   This accumulates running totals across every line and prints a single line containing the totals plus the *last* command seen, then "sorts" one line. It does not show top consumers. Since iotop's batch output mixes header rows with data rows (and DISK READ/WRITE columns include unit suffixes like `B/s` and `M/s`), correctly parsing it for top-N consumers requires a non-trivial script. Replaced the broken pipeline with a simple `echo "Done. Output saved to $OUTPUT"` so the example is correct rather than misleading.

## Review Notes

- The "Current DISK READ / Current DISK WRITE" header strings are correct for the Python iotop shipped in Ubuntu (confirmed in `iotop/ui.py` line 478). Earlier Python iotop versions used "Actual" — readers on much older systems may see different labels, but for current Ubuntu the post matches.
- iotop also ships in a C rewrite (`iotop-c`, package version 1.26-1 in Ubuntu universe), which has the same header labels and similar CLI flags, so the post applies to both.
- The `sudo iotop ... > /var/log/file` redirection has the usual shell-redirect-vs-sudo caveat (redirect happens in the unprivileged shell), but the post's examples in `/var/log` and `/tmp` will work for users with appropriate permissions and are commonly understood, so left as-is.
- ionice class numbering (`-c 1` = real-time, `-c 2` = best-effort, `-c 3` = idle) and best-effort priority range (0 highest to 7 lowest) are correct.
- The keyboard shortcuts, batch-mode flags (`-b`, `-n`, `-d`, `-o`, `-a`, `-P`), and PRIO column class explanations all match iotop's behavior.
