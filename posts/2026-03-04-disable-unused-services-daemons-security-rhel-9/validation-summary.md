# Validation Summary: How to Disable Unused Services and Daemons on RHEL for Better Security

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd and systemctl
- systemd service, socket, and timer units
- Linux socket inspection with ss
- Bash shell scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systemd, including systemctl service status, disable, --now, and mask behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Using systemd unit files to customize and optimize your system, including default enabled services and dnf-makecache.timer guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/using_systemd_unit_files_to_customize_and_optimize_your_system/Red_Hat_Enterprise_Linux-9-Using_systemd_unit_files_to_customize_and_optimize_your_system-en-US.pdf
- Red Hat Enterprise Linux 9 documentation: Managing software with DNF, including systemd timer usage and systemctl list-timers examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Linux ss(8) manual page, including -l, -t, -u, -n, and -p option behavior: https://man7.org/linux/man-pages/man8/ss.8.html
- Local command help output for systemctl and ss to verify command syntax.

## Issues Found
- The flowchart advised disabling listening services immediately. Changed it to investigate first, because a listening service should be reviewed before disabling to avoid breaking required workloads.
- The post said any service listening on a port is reachable over the network. Clarified that reachability depends on bind address and firewall rules.
- The timer section described systemd timers as a replacement for cron jobs. Changed this to "modern alternative" because cron remains valid and supported.
- The timer example used man-db-cache-update.timer, which is not a good RHEL 9 example. Replaced it with dnf-makecache.timer and added the condition that it should only be disabled if metadata is updated manually, matching Red Hat's RHEL 9 guidance.
- The essential-service verification loop omitted NetworkManager even though the preceding list included it. Added NetworkManager to the loop.
- The audit script used sed 's/.service//', where the unescaped dot could match any character and the pattern was not anchored. Changed it to sed 's/\.service$//' so only a trailing .service suffix is removed.
- The audit script checked only TCP sockets while excluding port 323, which is commonly UDP for chronyd. Changed the command to use ss -tulnp and filter the local address column for ports 22 and 323.

## Review Notes
The post is technically sound after the corrections. Several disable examples are package- and role-dependent, so they remain appropriate as candidates to review rather than universal actions for every RHEL host.
