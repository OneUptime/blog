# Validation Summary: How to Configure kdump for Kernel Crash Dump Analysis on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- kdump and kexec-tools
- makedumpfile
- crash utility
- GRUB kernel command-line configuration
- NFS and SSH dump targets
- LUKS-encrypted dump targets

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring kdump on the command line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kdump-on-the-command-line_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Supported kdump configurations and targets - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/supported-kdump-configurations-and-targets_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Analyzing a core dump - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/analyzing-a-core-dump_assembly_managing-kernel-command-line-parameters-with-uki
- kdump.conf(5) manual page - https://www.mankier.com/5/kdump.conf
- makedumpfile(8) manual page - https://www.mankier.com/8/makedumpfile

## Issues Found
- The install section used `systemctl enable kdump`, which enables startup at boot but does not start the service in the current session. Changed it to `systemctl enable --now kdump`.
- The local target example used `default reboot` to describe the action after a successful dump. `default` is obsolete and maps to failure handling; changed it to `final_action reboot`.
- The crash analysis section installed `kernel-debuginfo` without first enabling the RHEL debug repository. Added the `subscription-manager repos --enable rhel-9-for-$(uname -m)-baseos-debug-rpms` step.
- The cleanup cron job could match and remove `/var/crash` itself if that directory was older than 30 days. Added `-mindepth 1 -maxdepth 1` so only timestamped dump directories are removed.
- The encrypted disk guidance implied the main requirement was access to an encryption key. Red Hat documents the main RHEL 9 concern as additional reserved crashkernel memory for LUKS targets, so the section now uses `kdumpctl estimate` and shows increasing `crashkernel`.
- The troubleshooting section used a manual `kexec -l` command, which loads a normal kexec kernel rather than verifying the kdump panic kernel. Replaced it with `kdumpctl status`.

## Review Notes
The guide is technically relevant and largely aligned with RHEL 9 kdump documentation after the fixes. Future improvements could mention that the `path` directive is relative when a dump target is explicitly configured, and that SSH/raw dump targets use a flattened makedumpfile mode by default.
