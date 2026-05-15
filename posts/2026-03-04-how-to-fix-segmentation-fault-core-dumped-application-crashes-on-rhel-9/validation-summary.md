# Validation Summary: How to Fix 'Segmentation Fault (Core Dumped)' Application Crashes on RHEL 9

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-coredump and coredumpctl
- GDB and debuginfo packages
- DNF package management
- SELinux audit troubleshooting
- Valgrind
- Linux shared library diagnostics
- journalctl and dmesg

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Debugging Applications": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/debugging-applications_developing-applications
- Red Hat Enterprise Linux 9 documentation, "Setting up to debug applications": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/setting-up-a-development-workstation_developing-applications
- Red Hat Enterprise Linux 9 documentation, "Considerations in adopting RHEL 9": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_shells-and-command-line-tools_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Linux audit ausearch manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The post installed `gdb` before running `dnf debuginfo-install`, but Red Hat documents that the `dnf-utils` package is required to use `debuginfo-install` on RHEL 9. Changed the install command to `sudo dnf install -y gdb dnf-utils`.
- The post recommended installing and enabling ABRT. Red Hat documents that ABRT is not available in RHEL 9 and that `systemd-coredump` should be used instead. Replaced the ABRT section with `systemd-coredump` and `coredumpctl` guidance.

## Review Notes
The remaining commands are technically valid for a RHEL 9 troubleshooting workflow. Some commands use placeholders such as `<PID>`, `crashed-application`, and `crashed-package`; users must replace them with the actual process ID, executable, or package name for their system.
