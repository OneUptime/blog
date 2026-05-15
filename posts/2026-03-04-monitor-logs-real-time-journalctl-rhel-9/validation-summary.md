# Validation Summary: How to Monitor Logs in Real Time with journalctl -f on RHEL 9

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
- SELinux audit troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Troubleshooting problems by using log files, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- systemd journalctl manual, https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd-journald.service manual, https://www.freedesktop.org/software/systemd/man/latest/systemd-journald.service.html
- journald.conf manual, https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- rsyslog documentation, https://www.rsyslog.com/doc/
- Local command help/man pages for journalctl, systemctl, rsyslogd, systemd-journald.service, and journald.conf

## Issues Found
- The post said configuration files must be edited to monitor logs with `journalctl -f`. This was incorrect because `journalctl -f` is a built-in follow mode and does not require journald or rsyslog configuration changes. I changed Step 3 to run `sudo journalctl -f`, added a unit-specific follow example, and limited configuration-file guidance to storage, forwarding, and rsyslog rule changes.
- The package installation command installed `systemd`, even though `journalctl` and `systemd-journald` are provided by systemd and are already required on RHEL 9. I changed the first command to verify `systemd` and `rsyslog` with `rpm -q`, and kept `dnf install -y rsyslog` only for the case where rsyslog-dependent log files or forwarding are needed.
- The remote logging firewall example opened only TCP port 514. Rsyslog remote logging may use TCP or UDP depending on configuration, so I added the UDP example and clarified that users should open the protocol matching their rsyslog setup.

## Review Notes
The post is now technically correct for the stated `journalctl -f` use case. Future improvements could include examples for filtering by boot, priority, or service, but those are enhancements rather than correctness fixes.
