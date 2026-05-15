# Validation Summary: How to Review and Filter System Logs Using the RHEL Web Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL web console / Cockpit
- systemd-journald
- journalctl
- systemd journald configuration
- shell commands for log filtering

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Reviewing and filtering logs in the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9 documentation: Configuring persistent logging by using the journald RHEL system role: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-the-systemd-journal-by-using-the-journald-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Local `journalctl --help` output for current `journalctl` options and flags.
- Local `journald.conf(5)` man page for journald drop-in configuration and size limit options.
- Local `systemd-journald.service(8)` man page for journal storage locations and persistent journal setup.

## Issues Found
- The post stated that RHEL stores the systemd journal persistently in `/var/log/journal/` by default. Red Hat's RHEL 9 documentation says the default systemd journal is stored in `/run/log/journal`, which is not persistent. Updated the text to say persistent storage must be configured in `/var/log/journal/`.
- The persistence setup used `systemctl restart systemd-journald` after creating `/var/log/journal`. RHEL/systemd documentation recommends flushing the journal to switch from volatile to persistent storage after the directory exists. Replaced the restart command with `journalctl --flush`.
- The post stated that Cockpit search updates in real time as you type. RHEL 9 web console documentation describes typing the filter expression and applying it. Updated the sentence to say to apply the filter after typing the search expression.
- The journald size configuration example wrote to `/etc/systemd/journald.conf.d/size.conf` without ensuring the drop-in directory exists. Added `sudo mkdir -p /etc/systemd/journald.conf.d` before the `tee` command.

## Review Notes
The `journalctl` examples use valid current options for priority, boot, unit, kernel, time range, output format, disk usage, and vacuuming. The SSH failed-login IP counting example depends on typical OpenSSH log message formatting, so it is useful for common RHEL logs but may need adjustment if sshd log formats are customized.
