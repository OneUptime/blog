# Validation Summary: How to Configure Automatic Crash Dumps with kdump on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- kdump
- kexec-tools
- kdump.conf
- crash utility
- kernel-debuginfo
- makedumpfile
- grubby
- systemd
- SysRq
- NFS and SSH kdump targets

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing kdump - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/installing-kdump_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Configuring kdump on the command line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kdump-on-the-command-line_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Supported kdump configurations and targets - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/supported-kdump-configurations-and-targets_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Analyzing a core dump - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/analyzing-a-core-dump_assembly_managing-kernel-command-line-parameters-with-uki

## Issues Found
- The install command included `kernel-debuginfo` without mentioning the required debug RPM repository or the need for a matching package. I changed the initial install command to install `kexec-tools` and `crash`, then clarified that matching `kernel-debuginfo` should be installed from the debug repository before analysis.
- The crashkernel section implied RHEL generally sets the parameter automatically during installation. I updated this to match RHEL 9 behavior, where `kexec-tools` maintains default reservation values, and added the documented `kdumpctl reset-crashkernel --kernel=ALL` command.
- The `/etc/kdump.conf` snippet used `default reboot` as the post-dump action. I replaced it with `final_action reboot` and added `failure_action reboot`, matching current RHEL 9 kdump configuration semantics.
- The `core_collector` example used `--message-level 7`. This is syntactically valid, but Red Hat's RHEL 9 example uses `--message-level 1` with `-d 31`, so I aligned the snippet with the documented default.
- The filtering table for dump level 31 omitted cache-private and free pages in the prose around the setting. I updated the comments and table to describe the level 31 exclusions accurately.
- The SSH target example omitted the `sshkey` directive required for the common documented SSH kdump configuration. I added `sshkey /root/.ssh/kdump_id_rsa`.
- The `path` comment described the path as relative to the filesystem root. I clarified that with no separate target configured, `path /var/crash` is an absolute local path.

## Review Notes
The remaining commands and examples are consistent with RHEL 9 documentation at the level expected for a practical guide. The article could later mention UKI-specific handling for systems booting unified kernel images, but that is outside the scope of the current post.
