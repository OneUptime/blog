# Validation Summary: How to Create a Monthly Maintenance Checklist for RHEL 9 Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management
- Red Hat Subscription Manager
- Red Hat Insights client
- OpenSCAP and SCAP Security Guide
- systemd, journalctl, and systemctl
- firewalld
- chrony
- Linux user, disk, network, and service administration commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing and monitoring security updates: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/index
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF needs-restarting plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/needs_restarting.html
- Red Hat Enterprise Linux 9 documentation: Scanning the system for configuration compliance and vulnerabilities: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Insights client configuration guide: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/epub/client_configuration_guide_for_red_hat_insights/assembly-insights-cli-options
- Red Hat Enterprise Linux 9 documentation: Automatically installing RHEL, subscription status verification: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings, chrony synchronization checks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- journalctl manual page: https://man7.org/linux/man-pages/man1/journalctl.1.html

## Issues Found
- The checklist used `needs-restarting -r` and `needs-restarting -s` directly. Red Hat's RHEL 9 security update documentation shows the command as the DNF plugin `dnf needs-restarting`, and the plugin documentation lists `-r` and `-s`. Updated both entries to `sudo dnf needs-restarting -r` and `sudo dnf needs-restarting -s`.
- The services entry said "Restart services needing restart" while the command only lists affected services. Updated the wording to "Restart affected services listed by" so the action matches the command behavior.
- The OpenSCAP command was an incomplete placeholder, `sudo oscap xccdf eval ...`. Replaced it with the documented RHEL 9 SCAP Security Guide form using `--report`, `--profile`, and `/usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml`.
- The DNF cache cleanup item said "Clean old packages" for `dnf clean all`. Updated the wording to "Clean DNF caches" because the command cleans DNF cache data, while installed old installonly packages are handled separately by `dnf remove --oldinstallonly`.

## Review Notes
Most checklist commands are valid as concise operational prompts, but several require installed packages or environment-specific values. For example, `smartctl` requires smartmontools and the correct device path, OpenSCAP requires `openscap-scanner` and `scap-security-guide`, and the SCAP profile ID must match the organization's selected baseline.
