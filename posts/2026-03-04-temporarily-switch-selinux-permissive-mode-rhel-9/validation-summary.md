# Validation Summary: How to Temporarily Switch SELinux to Permissive Mode for Troubleshooting on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux enforcing, permissive, and disabled states/modes
- SELinux runtime tools: `getenforce`, `setenforce`, `sestatus`
- SELinux policy management: `semanage permissive`, `semodule`, `audit2allow`
- Audit and troubleshooting tools: `ausearch`, `sealert`
- GRUB kernel command-line management with `grubby`

## Sources Consulted
- Red Hat Enterprise Linux 9: Using SELinux - Getting started with SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/getting-started-with-selinux_using-selinux
- Red Hat Enterprise Linux 9: Using SELinux - Changing SELinux states and modes: https://docs.redhat.com/documentation/red_hat_enterprise_linux/9/html/using_selinux/changing-selinux-states-and-modes_using-selinux
- Red Hat Enterprise Linux 9: Managing, monitoring, and updating the kernel - Configuring kernel command-line parameters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- `audit2allow(1)` Linux manual page: https://man7.org/linux/man-pages/man1/audit2allow.1.html
- `semanage-permissive(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/semanage-permissive.8.html

## Issues Found
- The workflow said `sudo ausearch -m avc -ts recent` would clear the audit log. This command searches recent AVC records; it does not clear logs. Updated the comment to say it checks recent AVC denials.
- The guide said the operation should succeed in permissive mode because SELinux is not blocking anything. That was too absolute because non-SELinux failures can still occur, and per-domain permissive mode only affects the selected domain. Updated the sentence to say it should succeed if SELinux enforcement was the cause.
- The `sealert -a /var/log/audit/audit.log` command depends on the `setroubleshoot-server` tooling being installed. Updated the command comment to state that prerequisite.
- The persistent-mode `sed` examples only changed the config when it already had the exact opposite value. Updated them to replace the active `SELINUX=` setting with the intended value.

## Review Notes
The core SELinux guidance is accurate for RHEL 9: `setenforce 0` and `setenforce 1` change runtime mode without persisting across reboots, `/etc/selinux/config` controls the configured mode after reboot, `semanage permissive -a` can make a single domain permissive, and `enforcing=0` is the documented boot parameter for starting in permissive mode. Future improvements could mention package prerequisites for `semanage`, `audit2allow`, and `sealert`, but the commands and concepts are technically correct after the edits above.
