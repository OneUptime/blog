# Validation Summary: How to Debug Segmentation Faults with gdb on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU Debugger (gdb)
- DNF and debuginfo packages
- systemd-coredump and coredumpctl
- RPM package queries

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Developing C and C++ applications in RHEL 9": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/
- Red Hat Enterprise Linux 9 documentation, "Debugging Applications": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/debugging-applications_developing-applications
- DNF debuginfo-install plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/debuginfo-install.html
- GNU gdb manual, "Backtrace": https://sourceware.org/gdb/current/onlinedocs/gdb.html/Backtrace.html
- systemd coredumpctl manual: https://www.freedesktop.org/software/systemd/man/latest/coredumpctl.html
- RPM manual: https://rpm.org/docs/4.19.x/man/rpm.8.html

## Issues Found
- The post described service configuration and service startup steps, but the topic is debugging segmentation faults. Replaced those commands with RHEL-documented core dump setup using `DumpCore=yes`, `DefaultLimitCORE=infinity`, `systemctl daemon-reexec`, and `ulimit -c unlimited`.
- The install command only installed `gdb`, but `dnf debuginfo-install` requires the `debuginfo-install` tool. Added `dnf-utils`, matching RHEL 9 documentation.
- The `coredumpctl debug <PID>` example was too narrow. Updated it to `coredumpctl debug <PID|COMM|EXE>` because coredumpctl accepts PID, command name, executable, or other matches.
- The verification command checked `strace`, `ltrace`, and `valgrind` even though the post did not install them. Updated verification to check `gdb` and `dnf-utils`, and added `coredumpctl list` to verify captured core dumps.
- The troubleshooting and conclusion referred generically to services. Adjusted the wording so service logs are mentioned only when the crashing application is run as a systemd service.

## Review Notes
The corrected guide remains intentionally brief. A future improvement would be to add a short example of compiling a test C program with `gcc -g` so readers can see source-level line numbers in gdb.
