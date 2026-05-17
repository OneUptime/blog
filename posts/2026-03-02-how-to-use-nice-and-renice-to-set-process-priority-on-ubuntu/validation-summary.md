# Validation Summary: How to Use nice and renice to Set Process Priority on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GNU coreutils `nice` (process priority on launch)
- util-linux `renice` (changing priority of running processes)
- util-linux `ionice` (I/O scheduling priority)
- `cpulimit` (percentage-based CPU throttling)
- `systemd` resource controls (`Nice=`, `IOSchedulingClass=`, `CPUQuota=`)
- `ps`, `top`, `htop` (priority observation)
- `stress` (load generation for testing)
- Ubuntu Linux process scheduling

## Sources Consulted
- `nice(1)` man page (GNU coreutils 9.4): https://www.gnu.org/software/coreutils/manual/html_node/nice-invocation.html
- `renice(1)` man page (util-linux): https://man7.org/linux/man-pages/man1/renice.1.html
- `ionice(1)` man page (util-linux): https://man7.org/linux/man-pages/man1/ionice.1.html
- `cpulimit` upstream source and Ubuntu manpage: https://github.com/opsengine/cpulimit
- `systemd.exec(5)` for `Nice=`, `IOSchedulingClass=`, `IOSchedulingPriority=`: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- `systemd.resource-control(5)` for `CPUQuota=`: https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- `ioprio_set(2)`: https://man7.org/linux/man-pages/man2/ioprio_set.2.html
- Debian and Ubuntu package search (to verify tool existence)

## Issues Found
- **Fabricated tool "fnice"**: The "Using nice in Cron Jobs" section referenced a non-existent `fnice` wrapper. No such tool exists in Debian, Ubuntu, Fedora, Arch, or any major package repository. Replaced the misleading example with a `nice -n 19 ionice -c 3 ...` combination, which is the standard pattern for CPU+I/O courtesy in cron jobs and is consistent with the rest of the post.

## Review Notes
- The GNU nice legacy syntax claim (`nice -10 command` = nice value 10, not -10) is correct for GNU coreutils. Older POSIX-only parsers may differ, but Ubuntu uses GNU nice.
- `ionice` priorities are only honored by I/O schedulers that support priority classes (CFQ — removed in 5.x — and BFQ). On modern Ubuntu, the default scheduler is `mq-deadline` for SATA SSDs/HDDs and `none` for NVMe, where `ionice` has little to no effect unless the user switches the device's scheduler to `bfq`. The post doesn't mention this caveat, but the commands are syntactically and semantically correct as documented.
- `IOSchedulingClass=` in systemd officially accepts the strings `realtime`, `best-effort`, `idle` (per `systemd.exec(5)`). The post uses the string `idle` in the example, which is correct. The integer mapping in the comment (0=default/none, 1=realtime, 2=best-effort, 3=idle) matches the underlying `ioprio_set(2)` kernel interface and is accurate for backward-compatible integer values.
- `cpulimit` syntax `cpulimit -l 50 /usr/local/bin/encoder.sh` is valid: `COMMAND [ARGS]` is an accepted TARGET form per the upstream `cpulimit.c` source.
- `renice -n 15 -p $$` inside a script works to lower the script's own priority; an unprivileged user cannot use it to raise priority, which is consistent with the post's earlier explanation.
