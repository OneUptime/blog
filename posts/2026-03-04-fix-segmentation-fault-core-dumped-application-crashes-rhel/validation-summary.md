# Validation Summary: How to Fix 'Segmentation Fault (Core Dumped)' Application Crashes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- Linux core dumps
- systemd-coredump
- coredumpctl
- GDB
- DNF and RPM
- journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up to debug applications": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/setting-up-a-development-workstation_developing-applications
- Red Hat Enterprise Linux 8 documentation, "Getting debuginfo packages for an application or library using GDB": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/developing_c_and_cpp_applications_in_rhel_8/debugging-applications_developing-applications
- Red Hat Enterprise Linux 8.6 Release Notes, ABRT deprecation and systemd-coredump replacement: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/pdf/8.6_release_notes/Red_Hat_Enterprise_Linux-8-8.6_Release_Notes-en-US.pdf
- Red Hat Knowledgebase, "How to configure systemd-coredump to store core dumps in another directory than /var/lib/systemd/coredump": https://access.redhat.com/solutions/5987941
- systemd coredumpctl manual: https://www.freedesktop.org/software/systemd/man/latest/coredumpctl.html
- systemd-coredump manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-coredump.html
- Linux core(5) manual page: https://man7.org/linux/man-pages/man5/core.5.html
- Local bash manual page for ulimit behavior.

## Issues Found
- The post instructed readers to install `debuginfo-install` as a package with `sudo dnf install gdb debuginfo-install`. Red Hat documents `debuginfo-install` as a tool provided by the `dnf-utils` package on RHEL. Updated the command to `sudo dnf install gdb dnf-utils`.

## Review Notes
The post is technically accurate after the fix. The explanation of `error 4` in kernel segfault logs is correct for x86 page-fault error bits, but it is architecture-specific; a future revision could mention that caveat if the post broadens beyond common x86_64 RHEL systems.
