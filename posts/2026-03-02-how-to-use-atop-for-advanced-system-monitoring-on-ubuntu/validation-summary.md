# Validation Summary: How to Use atop for Advanced System Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `atop` (system performance monitor)
- `netatop` (kernel module for per-process network stats)
- Ubuntu / Debian package management (`apt`)
- `systemd` (`systemctl`)
- `/etc/default/atop` configuration
- `awk`, `bc`, shell scripting for alerting
- `mail` for notifications

## Sources Consulted
- atop(1) manpage (Debian Bookworm): https://manpages.debian.org/bookworm/atop/atop.1.en.html
- atop(1) manpage (Ubuntu Jammy): https://manpages.ubuntu.com/manpages/jammy/man1/atop.1.html
- Official atop project page: https://www.atoptool.nl/
- Atoptool/atop on GitHub: https://github.com/Atoptool/atop
- Default `/etc/default/atop` distributed with the Debian/Ubuntu `atop` package

## Issues Found

1. **Keyboard navigation table — sort vs. view keys confused.** The original table mapped lowercase `c`, `m`, `d`, `n`, `a` to sort actions. In atop these lowercase keys select the *view* (which set of per-process columns are shown), while *sort* is bound to the uppercase equivalents (`C`, `M`, `D`, `N`, `A`). Rewrote the table accordingly and added a note about the upper/lowercase convention.

2. **Keyboard table — wrong meanings for `t`, `p`, `u`, `f`, `z`, `i`.** The original table claimed `t` shows network per process, `p` shows disk per process, `u` shows memory per process, `f` hides idle lines, `z` toggles active rows, and `i` toggles idle processes. Per the man page, network/disk/memory per-process views are `n`/`d`/`m`; `p` aggregates per program; `u` filters by user; `z` pauses output; `i` modifies the interval timer. Removed the bogus `f` row and the trailing sentence claiming `f` hides zero-activity lines (no such key exists), and corrected the rest.

3. **Replay mode — `g` does not fast-forward to high activity.** Removed the bullet claiming `g` fast-forwards to the next high-activity interval. `g` is the generic-view toggle; there is no such fast-forward feature in atop replay mode.

4. **Config variable name — `INTERVAL` → `LOGINTERVAL`.** The variable controlling the daemon's logging interval in `/etc/default/atop` is `LOGINTERVAL`, not `INTERVAL`. Updated the two `nano` snippets and the `sed -i` one-liner in the "Quick start" block.

5. **Data retention guidance referenced `LOGPATH` for retention.** Clarified that retention is controlled by `LOGGENERATIONS` (days), with `LOGPATH` controlling the log directory.

6. **Invalid `atop -u www-data` command.** atop has no `-u` command-line flag for filtering by user; `u` is only an interactive key. Removed the bogus shell example and kept the interactive-mode guidance.

7. **Broken CPU-percentage awk in the alert script.** The original used `awk '/^CPU/ {print 100 - $NF}'`. In the `-P CPU` parseable output, `$NF` is not idle ticks (in modern atop it is `cycles`), so `100 - $NF` produces nonsense. Replaced with an awk that computes `(total - idle) / total * 100` from fields 9–17 (sys, user, nice, idle, wait, irq, softirq, steal, guest) using the latest of two samples (`atop -P CPU 2 2`).

## Review Notes

- The `netatop` install snippet uses `sudo apt install netatop`. On modern Ubuntu releases the package is typically `netatop-dkms` (in universe), and a matching kernel-headers package is required for DKMS to build the module. Left the original wording because availability and naming vary by release/PPA and the post is intentionally distribution-agnostic about this optional component.
- After `apt install atop`, the `atop.service` unit is usually enabled and running on Ubuntu, so the explicit `systemctl enable` / `start` is redundant but harmless. Left as-is for instructional clarity.
- The `atop -P CPU` field layout has grown over atop 2.x releases (newer versions append `freq`, `freq%`, `instructions`, `cycles`). The corrected awk uses fixed field indices 9–17 (sys..guest), which are stable across the recent 2.x line, but a future major version could shift them.
- The Quick Start block at the end recommends `LOGINTERVAL=60` (1-minute sampling). This is a reasonable default for incident analysis but is roughly 10x more storage than the packaged default; the body already mentions storage scaling, so no further changes were needed.
