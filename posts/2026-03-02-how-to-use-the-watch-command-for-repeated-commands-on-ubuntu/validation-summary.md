# Validation Summary: How to Use the watch Command for Repeated Commands on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- `watch` command (procps-ng)
- Ubuntu / Linux command line
- Related monitoring utilities referenced in examples: `df`, `du`, `free`, `ss`, `netstat`, `ps`, `pgrep`, `uptime`, `tail`, `grep`, `mpstat`, `systemctl`, `kubectl`, `docker`, `psql`, `mysql`, `pytest`, `make`

## Sources Consulted
- `watch --help` output from procps-ng (verified on local Ubuntu system)
- `man watch(1)` (procps-ng) – https://man7.org/linux/man-pages/man1/watch.1.html
- procps-ng source repository – https://gitlab.com/procps-ng/procps

## Issues Found

1. **Incorrect argument to `-d`/`--differences`.** The post used `watch -d=cumulative` in two places. The actual argument accepted by procps-ng's `watch` is `permanent`, not `cumulative`. Replaced both instances with `-d=permanent`.

2. **Incorrect description of `-d=permanent` semantics.** The post described it as "keep them highlighted until they change back," which is the opposite of the actual behavior. Per the man page, the `permanent` argument makes `watch` show *all* changes since the first iteration (changes stay highlighted indefinitely, even after the value reverts). Updated the comment to reflect this.

3. **Missing quoting in the `netstat` example.** `watch -d=cumulative netstat -an | grep ESTABLISHED` would actually pipe `watch`'s output (including its header) to `grep`, not run the pipeline inside `watch`. Fixed by wrapping the pipeline in single quotes: `watch -d=permanent 'netstat -an | grep ESTABLISHED'`.

4. **Incorrect description of `-e`/`--errexit`.** The post said "exits and reports an error when the command's exit status changes." The actual behavior (per man page) is "Freeze updates on command error, and exit after a key press" — i.e., it triggers on a non-zero exit, not on a *change* in exit status. Rewrote the description and added a follow-up note about `-g`/`--chgexit`, which is the flag that exits when the output of the command changes.

5. **Inaccurate description of the watch header.** The post claimed the display shows "the current timestamp, and how long ago the output was generated." The actual header shows the update interval, the command, the hostname, and the current time — not "how long ago." Updated accordingly.

6. **Quick Reference updates.** Updated the reference table to use `-d=permanent`, clarified the `-e` behavior, and added the `-g` flag for exiting when output changes.

## Review Notes
- The section title "Beeping on Change" is slightly misleading since `-b` beeps on non-zero exit (not on output change), but the body text correctly describes the behavior. Left the heading as-is to avoid restructuring the post.
- Sub-second intervals (`-n 0.5`) work in procps-ng `watch`, but per the man page the minimum is 0.1 seconds; values smaller than that are clamped. The post's example of `0.5` is within the supported range.
- The `-x`/`--exec` flag (which uses `exec` instead of `sh -c` and reduces the need for quoting) is not covered. Could be a useful addition in a future revision but is not strictly required for correctness.
- The `-q`/`--equexit` flag (exit when output does not change for N cycles) is also not covered; potential future enhancement.
- Examples invoking external tools like `kubectl`, `docker`, `psql`, `mysql`, `mpstat` assume those tools are installed and configured; this is reasonable for a `watch`-focused tutorial.
