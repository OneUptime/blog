# Validation Summary: How to Use nice and renice to Manage Process Priorities on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux process scheduling and nice values
- GNU coreutils `nice`
- util-linux `renice`
- systemd service unit configuration
- Linux-PAM `limits.conf`

## Sources Consulted
- Red Hat Enterprise Linux for Real Time 9 documentation, "Setting the priority for a process with library calls": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/optimizing_rhel_9_for_real_time_for_low_latency_operation/assembly_setting-the-priority-for-a-process-with-library-calls_optimizing-rhel9-for-real-time-for-low-latency-operation
- Linux man-pages `nice(1)`: https://man7.org/linux/man-pages/man1/nice.1.html
- Linux man-pages `renice(1)`: https://man7.org/linux/man-pages/man1/renice.1.html
- Linux man-pages `setpriority(2)`: https://man7.org/linux/man-pages/man2/setpriority.2.html
- Linux man-pages `getrlimit(2)`: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux-PAM `limits.conf(5)`: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Local `nice --help`, `renice --help`, and `systemd.exec(5)` man page output

## Issues Found
- The `nice ./my-script.sh` example labeled the result as "Default nice (10)". GNU `nice` applies a default adjustment of `+10`, which only results in a final nice value of 10 when the parent process starts at nice value 0. Changed the comment to "Default adjustment (+10)".
- The permission rules stated that regular users cannot set nice values below 0 and cannot decrease a nice value after increasing it. Linux allows this when the user has a suitable `RLIMIT_NICE` resource limit. Added that exception to both bullets.
- The `limits.conf` section described the `nice` item as a default nice value. In Linux-PAM, the `nice` item sets the maximum nice priority a user can raise to; it is not a default process nice value. Changed the heading, introductory sentence, and example comment to describe limits accurately.

## Review Notes
- The examples use util-linux `renice` absolute priority behavior, which matches current Linux behavior when `POSIXLY_CORRECT` is not set. For portable POSIX-style relative changes, use `--relative` or account for `POSIXLY_CORRECT`.
- Nice values are scheduler inputs for normal non-real-time processes, not hard CPU guarantees. Actual CPU distribution can also be affected by cgroups, CPU quotas, autogrouping, and scheduler policy.
