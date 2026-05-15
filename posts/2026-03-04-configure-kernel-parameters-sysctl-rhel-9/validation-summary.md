# Validation Summary: How to Configure Kernel Parameters with sysctl on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel runtime parameters
- sysctl and procps-ng
- /proc/sys virtual filesystem
- /etc/sysctl.d configuration files
- Linux networking, virtual memory, and filesystem sysctl tunables
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring kernel parameters at runtime": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-parameters-at-runtime_managing-monitoring-and-updating-the-kernel
- procps-ng sysctl(8) manual page via local man page and man7.org: https://man7.org/linux/man-pages/man8/sysctl.8.html
- systemd sysctl.d(5) manual page via local man page: https://www.freedesktop.org/software/systemd/man/latest/sysctl.d.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel VM sysctl documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html
- Linux kernel filesystem sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/fs.html

## Issues Found
- The original `sysctl --system` explanation listed the configuration paths in the wrong order and omitted `/lib/sysctl.d/`. Updated the paragraph to match procps-ng `sysctl(8)`: `/etc/sysctl.d/`, `/run/sysctl.d/`, `/usr/local/lib/sysctl.d/`, `/usr/lib/sysctl.d/`, `/lib/sysctl.d/`, then `/etc/sysctl.conf`, with lexicographic sorting and `/etc/sysctl.conf` read last.
- The troubleshooting `grep` command did not search all locations that `sysctl --system` can read. Updated it to include `/run/sysctl.d/`, `/usr/local/lib/sysctl.d/`, and `/lib/sysctl.d/`.

## Review Notes
The runtime and persistent sysctl commands, `/proc/sys` examples, configuration syntax, and listed tunables were otherwise consistent with RHEL 9 documentation, procps-ng documentation, and Linux kernel sysctl documentation. Some tuning values are workload-dependent and should be tested before use in production.
