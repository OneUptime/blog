# Validation Summary: How to Set Mount Options for Security (nosuid, noexec, nodev) on RHEL

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mount options
- `/etc/fstab`
- `mount`
- `findmnt`
- tmpfs and XFS mount examples
- CIS and DISA STIG filesystem hardening guidance

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-file-systems_managing-file-systems
- Red Hat Enterprise Linux 9 Securing networks documentation, NFS mount security options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/securing-the-nfs-service_securing-network-services
- Linux `mount(8)` manual page, filesystem-independent options: https://man7.org/linux/man-pages/man8/mount.8.html
- Linux `fstab(5)` manual page, `/etc/fstab` field format: https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux `findmnt(8)` manual page, output columns and target syntax: https://man7.org/linux/man-pages/man8/findmnt.8.html
- DISA STIG RHEL 9 `/dev/shm` nodev/noexec/nosuid examples: https://stigviewer.cyberprotection.com/stigs/red_hat_enterprise_linux_9/2025-05-14/finding/V-257863
- DISA STIG RHEL 9 `/home` nodev/noexec/nosuid examples: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2025-05-14/finding/V-257850

## Issues Found
- The `nosuid` explanation mentioned SUID and SGID bits but omitted file capabilities. Updated the text to include file capabilities, matching `mount(8)`.
- The `noexec` explanation said it prevents execution of any binaries. Updated it to say it prevents direct execution of binaries and other executable files from the mounted filesystem, matching `mount(8)` wording more closely.
- The `nosuid` test was shown immediately after examples that also apply `noexec`, which would prevent the test binary from running and obscure whether `nosuid` was working. Updated the sentence to say the test should be performed on a mount that has `nosuid` but not `noexec`.

## Review Notes
The commands and `/etc/fstab` snippets use valid mount option names and valid fstab field ordering. The partition recommendations are broadly consistent with hardening benchmark examples, but applying `noexec` to user or service data partitions can break development workflows, CGI/web workloads, and some application installers, so production systems should tailor these options to the required benchmark profile and application layout.
