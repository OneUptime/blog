# Validation Summary: How to Configure kdump via Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- kdump
- systemd
- grubby

## Sources Consulted
- Red Hat Documentation: Configuring kdump in the web console - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kdump-in-the-web-console_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Documentation: Configuring kdump on the command line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kdump-on-the-command-line_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Documentation: Managing systems using the RHEL 9 web console - https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index

## Issues Found
- The original post used generic placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`, which would not configure kdump or Cockpit. Replaced them with RHEL 9 web console, `kdump.service`, `kdumpctl`, and package verification commands.
- The original post did not describe the Cockpit Kernel dump workflow. Added the documented RHEL web console actions for enabling kdump, configuring crash kernel memory, choosing local/SSH/NFS dump targets, and optional compression.
- The original verification section checked a placeholder service and logs. Updated it to use `kdumpctl status` and `journalctl -u kdump.service`.
- The original troubleshooting section was generic. Updated it with kdump-specific service logs, package checks, and the RHEL 9 requirement that configured dump target directories exist before `kdump.service` starts.

## Review Notes
The article is now technically aligned with RHEL 9 documentation. Testing kdump intentionally crashes the kernel, so the post includes a non-production/maintenance-window warning.
