# Validation Summary: How to Manage Process Priorities with nice and renice on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL/Linux process scheduling
- GNU coreutils `nice`
- util-linux `renice`
- util-linux `ionice`
- systemd service unit `Nice=`
- PAM `/etc/security/limits.conf`

## Sources Consulted
- GNU Coreutils manual, `nice`: https://www.gnu.org/s/coreutils/manual/html_node/nice-invocation.html
- util-linux `renice(1)` manual via local `renice --help` and Linux man-pages: https://man7.org/linux/man-pages/man1/renice.1.html
- util-linux `ionice(1)` manual via local `ionice --help` and Linux man-pages: https://man7.org/linux/man-pages/man1/ionice.1.html
- systemd.exec `Nice=` documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Linux `nice(2)` manual for privilege and `RLIMIT_NICE` behavior: https://man7.org/linux/man-pages/man2/nice.2.html
- `limits.conf(5)` manual for PAM nice limits: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Red Hat Enterprise Linux for Real Time scheduling documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/7/html/reference_guide/chap-priorities_and_policies

## Issues Found
- The post stated that only root can set negative nice values. Linux also permits unprivileged users to lower nice values when they have a suitable `RLIMIT_NICE` soft limit, so the wording was changed to include users with suitable limits.
- The prerequisite for setting negative nice values mentioned only root or sudo access. It was updated to include suitable limits configuration.
- The `nice -n 10` explanation treated the argument as an absolute final niceness. GNU `nice -n` applies an adjustment to the inherited niceness, so the explanation now states that it becomes niceness 10 from the default 0.
- The `/etc/security/limits.conf` example used `soft nice 0` with `hard nice -10`, which would not directly give new login sessions a soft limit allowing `nice -n -10`. The soft limit was changed to `-10` to match the stated goal.

## Review Notes
The commands and configuration snippets are otherwise current and valid for typical RHEL systems. The `ionice` behavior depends on Linux I/O scheduler support, so future revisions could mention scheduler-specific effects, but the example and class names are correct.
