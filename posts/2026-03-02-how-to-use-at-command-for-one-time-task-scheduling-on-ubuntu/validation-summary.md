# Validation Summary: How to Use at Command for One-Time Task Scheduling on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `at` command (Ubuntu/Debian `at` package, version 3.2.x)
- `atd` daemon
- `atq` / `atrm` / `batch` companion utilities
- systemd (used for managing the `atd` service)
- `/etc/at.allow` and `/etc/at.deny` access control files

## Sources Consulted
- `at(1)` man page (Debian/Ubuntu `at` 3.2.5)
- `batch(1)` man page
- `atd(8)` man page
- `at` source `parsetime.y` grammar (timespec definitions: relative units, `now + N`, `teatime`, `noon`, `midnight`, `tomorrow`, `next ...`, day words)
- POSIX timespec documentation for accepted date formats (`MMDD[CC]YY`, `MM/DD/[CC]YY`, `DD.MM.[CC]YY`, `[CC]YY-MM-DD`)
- Ubuntu package metadata via `apt-cache show at` (confirmed package name `at`, version `3.2.5-2.1ubuntu3`)

## Issues Found

1. **Incorrect MMDDYY example date** — The post showed `at 14:30 050326  # MMDDYY format - March 5, 2026`. In POSIX MMDDYY format, `050326` parses as MM=05, DD=03, YY=26 (i.e. May 3, 2026), not March 5, 2026. Corrected the digits to `030526` so the example matches its comment.

2. **Incorrect description of the `=` queue** — The post claimed "The = queue is used for batch jobs (runs when load is low)". Per `at(1)`, the `=` queue is reserved for *currently running* jobs and cannot be used as a submission target. The example below the comment actually used `-q b`, which is the genuine default batch queue. Rewrote the inline comment to correctly describe queue `b` as the default batch queue and clarify that `=` is reserved for running jobs.

## Review Notes

- All other technical content checked out against the `at`, `batch`, and `atd` man pages: `atq`/`at -l`, `atrm`/`at -r`, `at -c <job>`, the `teatime`/`noon`/`midnight` keywords, `now + N <unit>`, `next monday`/`next saturday`, the `-q <letter>` queue selector, the default batch load threshold of 1.5, `/etc/at.allow` / `/etc/at.deny` semantics, and the `/etc/default/atd` `-l` and `-b` options.
- The statement that "letters closer to 'a' have higher priority" is accurate: queue `a` runs with the lowest niceness; queues alphabetically later run with increasing niceness (lower priority).
- The post does not mention that uppercase queue letters (e.g. `-q B`) make `at` treat the submission as a batch job (load-aware). This is a minor omission rather than an inaccuracy and was left as-is per the "only fix technical errors" guidance.
- The post does not mention that when only a time of day is given (e.g. `at 11pm`) and that time has already passed today, `at` schedules it for the next day. Again, an omission rather than an error.
