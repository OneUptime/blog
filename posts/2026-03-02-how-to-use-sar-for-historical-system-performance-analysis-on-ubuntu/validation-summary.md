# Validation Summary: How to Use sar for Historical System Performance Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- sysstat package
- sar (System Activity Reporter)
- sadf (System Activity Data Formatter)
- Ubuntu / Debian systemd service management
- cron / debian-sa1 collector

## Sources Consulted
- `man sar` (sysstat package, local system)
- `man sadf` (sysstat package, local system)
- Sysstat official documentation: https://github.com/sysstat/sysstat
- Sysstat man pages: http://sebastien.godard.pagesperso-orange.fr/man_sar.html and http://sebastien.godard.pagesperso-orange.fr/man_sadf.html
- Debian/Ubuntu sysstat package layout (`/etc/default/sysstat`, `/etc/cron.d/sysstat`, `/etc/sysstat/sysstat`)

## Issues Found

1. **`sar -u ALL` mislabeled as per-CPU breakdown.** `-u ALL` reports additional CPU fields (`%usr`, `%sys`, `%irq`, `%soft`, etc.) but still aggregates across all processors. Per-CPU breakdown requires `-P ALL`. Updated the CPU Statistics section to list both flags with correct descriptions.

2. **`sar -S` documented as showing `pswpin/s` / `pswpout/s`.** This is incorrect: `-S` shows swap *space* utilization (`kbswpfree`, `kbswpused`, `%swpused`, `kbswpcad`, `%swpcad`). The paging counters `pswpin/s` and `pswpout/s` are produced by `-W` (swapping statistics). Updated the Swap Statistics section to include both `-S` and `-W` with correct descriptions, and corrected the explanation that follows.

3. **`sar -w` described as showing "context switches and interrupts".** `-w` reports task creation and system switching (`proc/s`, `cswch/s`) only — interrupt statistics are reported by `-I`. Renamed the section, fixed the comment, and added `sar -I ALL` as a separate example.

4. **`sadf -g` described as producing HTML.** `sadf -g` produces SVG (Scalable Vector Graphics), not HTML. Renamed the section to "Generating SVG Graphs", changed the output filename to `report.svg`, and updated the surrounding text.

5. **`sadf -d` described as "proper CSV output".** `sadf -d` emits semicolon-separated fields aimed at database ingestion, not strictly CSV. Removed the misleading awk pipe (which would not produce valid CSV from `sar` text output anyway) and clarified that `-d` is semicolon-separated.

6. **Post-incident workflow used `sar -S` for "swap activity".** Changed to `sar -W` so it actually surfaces paging activity during the incident window (the original `-S` only shows how full swap was, not whether the kernel was actively paging).

7. **Minor: comment on `sar -r ALL`** described it as "Memory utilization percentage", but `%memused` is already in plain `sar -r`. `-r ALL` adds fields like `kbactive`, `kbinact`, `kbdirty`. Updated the comment to reflect this.

## Review Notes

- Default sysstat collection cadence on Debian/Ubuntu (`5-55/10 * * * *`, 10 minutes) and the data file naming convention (`saDD` in `/var/log/sysstat/`) are correct.
- The `ENABLED="true"` toggle in `/etc/default/sysstat` and the `HISTORY` setting in `/etc/sysstat/sysstat` are accurate.
- The example column descriptions for `-r`, `-q`, `-n DEV`, and `-d` are consistent with the current sysstat man page.
- Newer sysstat versions also support a `saYYYYMMDD` filename format (enabled with the `-D` option to `sadc`). The post sticks with the default `saDD` form which is fine to keep as-is; it just means data older than ~28 days is overwritten on the same-day-next-month basis.
- The `sar -q` queue/load-average example is accurate; in very recent sysstat versions `-q` accepts sub-keywords (`LOAD`, `CPU`, `PSI-CPU`, etc.) for finer reports, but the bare `-q` shown still works.
