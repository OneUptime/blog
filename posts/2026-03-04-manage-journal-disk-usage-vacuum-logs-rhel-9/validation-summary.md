# Validation Summary: How to Manage Journal Disk Usage and Vacuum Old Logs on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journalctl
- rsyslog
- firewalld
- SELinux auditing tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Troubleshooting problems by using log files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Configuring a remote logging solution": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/249/journald.conf.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local `journalctl --help` and `systemctl --help` output

## Issues Found
- The package installation command included `systemd`, even though systemd-journald is part of the base systemd installation on RHEL 9. I changed the command to install only `rsyslog` and clarified that systemd-journald is part of systemd.
- The post said it explained journal disk usage management and vacuuming, but it did not include the actual journald size/retention settings or vacuum commands. I added a journald drop-in example with `SystemMaxUse`, `SystemKeepFree`, and `MaxRetentionSec`, plus `journalctl --rotate`, `--vacuum-size`, and `--vacuum-time`.
- The verification step did not check journal disk usage. I added `journalctl --disk-usage`.
- The firewall step implied TCP 514 is always the necessary remote logging port. I narrowed the wording to rsyslog setups receiving remote logs over TCP port 514.

## Review Notes
The example retention and size values are illustrative and should be adjusted for production retention, compliance, and available disk capacity. Vacuuming affects archived journal files; rotating first ensures the current active file is eligible for cleanup.
