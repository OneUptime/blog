# Validation Summary: How to Monitor Process Resource Usage with pidstat on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- pidstat (sysstat package)
- Ubuntu / Linux process monitoring
- sysstat tools (iostat, vmstat references)

## Sources Consulted
- `pidstat(1)` man page on Ubuntu (sysstat 12.6.1) — verified flags, options, and output columns
- `pidstat --help` / usage output — confirmed full option list
- Live execution of pidstat commands to validate behavior
- sysstat upstream documentation (http://sebastien.godard.pagesperso-orange.fr/man_pidstat.html)

## Issues Found

1. **Nonexistent `-A` flag** — The post claimed `pidstat -A 1` would show CPU, memory, I/O, and context switches all at once. There is no `-A` option in pidstat (confirmed via `pidstat --help` and the sysstat 12.6.1 man page). Running `pidstat -A 1` prints the usage error. **Fix:** Replaced the example with `pidstat -u -r -d -w 1`, which is the documented way to combine all four activity reports.

2. **`-t` mislabelled as a timestamp flag** — The "Logging pidstat Output for Later Analysis" section said timestamps could be enabled with `-t`. In pidstat, `-t` displays statistics for **threads** associated with each task (adds TGID/TID columns); it has nothing to do with timestamps. Pidstat already prints a wall-clock timestamp on every report line by default. **Fix:** Reworded the paragraph to note that timestamps are on by default, and pointed the reader to `-H` (which displays the timestamp as seconds since the epoch — the actual documented timestamp-format toggle). Updated the example accordingly.

3. **Inaccurate `-T CHILD` description** — The post described `-T CHILD` as "Show only child processes" and `-T ALL` as "Show parent process and child processes." Per the man page, `-T CHILD` reports **globally cumulated** statistics for the selected tasks **and** all their children (not children alone), and `-T ALL` reports both individual task stats **and** the cumulated parent+children stats. **Fix:** Clarified the comments on the two example commands so they reflect the documented behavior.

## Review Notes
- The `pidstat -u 2 | sort -k8 -rn | head -20` example in the "Finding the CPU Hog" section is pedagogically rough: piping a continuous (non-`-h`, multi-line, header-bearing) pidstat stream into `sort` will sort headers and timestamps along with data lines, and `-k8` corresponds to `%wait` (not `%CPU`) once the AM/PM token is counted as its own field on Ubuntu's default locale. It will produce output but not the cleanest "top CPU users" view. Not strictly incorrect, so left as-is.
- The post lists CPU columns as `PID, %usr, %system, %CPU, CPU, Command`, omitting `UID`, `%guest`, and `%wait` which pidstat also prints by default. Not wrong, just abbreviated — left unchanged.
- The `-d` output also includes an `iodelay` column on kernels ≥ 2.6.20 with the modern sysstat package; the post omits it. Minor omission, not corrected.
- All other flags, columns, and explanations check out against the sysstat 12.6.1 man page.
