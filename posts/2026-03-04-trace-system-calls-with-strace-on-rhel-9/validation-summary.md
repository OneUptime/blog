# Validation Summary: How to Trace System Calls with strace on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- `strace`
- Linux system calls
- `dnf`
- `rpm`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Monitoring an application's system calls with strace": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/debugging-applications_developing-applications
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Upstream `strace(1)` manual page: https://man7.org/linux/man-pages/man1/strace.1.html
- RPM official `rpm(8)` manual page: https://rpm.org/docs/4.19.x/man/rpm.8.html

## Issues Found
- The post used service-management sections and `systemctl` examples for a guide about tracing system calls. I replaced those with `strace` installation and trace-refinement commands because there is no service to enable or start when using `strace`.
- The post used `strace -e trace=file` and `strace -e trace=network`. The current upstream `strace` manual documents the percent-prefixed syscall groups, and notes that using group names without `%` is deprecated for groups such as `network`. I changed these examples to `trace=%file` and `trace=%network`.
- The verification and troubleshooting sections referred to service status and generic package checks. I changed them to verify `strace` installation with `rpm -q strace`, review trace logs, and troubleshoot process attach permissions.

## Review Notes
- The remaining `strace` examples are valid for RHEL-style systems: `-o` writes trace output to a file, `-p` attaches to a process by PID, `-c` prints a syscall summary, `-f` follows child processes and threads, `-tt` adds timestamps, and `-T` shows syscall duration.
- Attaching to another user's process can require elevated privileges. The post now points readers to use sufficient privileges when attaching to a PID.
