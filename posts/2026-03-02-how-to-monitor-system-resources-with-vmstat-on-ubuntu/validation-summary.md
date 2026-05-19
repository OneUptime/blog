# Validation Summary: How to Monitor System Resources with vmstat on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- vmstat (procps-ng)
- Ubuntu Linux
- Bash / awk
- Linux system performance monitoring (CPU, memory, swap, I/O)

## Sources Consulted
- vmstat(8) man page from procps-ng 4.0.4 (verified locally)
- procps-ng project: https://gitlab.com/procps-ng/procps
- Ubuntu package archive entry for `procps`: https://packages.ubuntu.com/jammy/procps

## Issues Found
- The "I/O" section described `bi`/`bo` as "blocks per second" with the heading "I/O (in blocks per second)". In modern procps-ng (the vmstat shipped on current Ubuntu releases), these columns are reported in **KiB/s**, not raw 512-byte blocks. Updated the section heading to "I/O (in KiB/s)" and the column descriptions to say "Kibibytes received/sent from a block device" to match the official vmstat(8) man page.

## Review Notes
- All other column names, descriptions, and flag descriptions (`-s`, `-d`, `-p`, `-m`, `-t`) match the vmstat(8) man page from procps-ng 4.0.4.
- The awk column indices used in the diagnostic snippets (e.g. `$7+$8` for `si+so`, `$12` for `cs`, `$16` for `wa`) are correct against the standard 17-column vmstat output.
- The note that the first vmstat line is averages since boot is accurate (man page: "The first report produced gives averages since the last reboot.").
- The "Available memory is closer to `free + buff + cache`" comment is a reasonable simplification; `MemAvailable` from `/proc/meminfo` is the more precise value, but the post's intuition is correct.
- The example `awk 'NR>2 {print $1, "r:", $1}'` prints the `r` column twice — harmless but slightly redundant; left unchanged as it is not technically wrong.
- The post uses `procps` as the Ubuntu package name, which is correct (Ubuntu ships procps-ng under the package name `procps`).
