# Validation Summary: How to Set Up Log Rotation with logrotate on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- logrotate
- systemd timers
- systemd-journald
- rsyslog
- firewalld
- SELinux audit troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/Red_Hat_Enterprise_Linux-9-Considerations_in_adopting_RHEL_9-en-US.pdf
- Red Hat Enterprise Linux Deployment Guide, Log Rotation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-log_rotation
- Red Hat Customer Portal, How to debug logrotate warnings or errors when logrotate is not running correctly: https://access.redhat.com/solutions/32831
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/red_hat_enterprise_linux-9-configuring_firewalls_and_packet_filters-en-us.pdf
- Local `logrotate(8)` manual page
- Local `logrotate.timer` unit documentation

## Issues Found
- The package installation step installed `rsyslog` and `systemd` instead of `logrotate`. Changed it to install `logrotate`, which provides the log rotation command and timer.
- The configuration step pointed readers to `/etc/rsyslog.conf`, `/etc/rsyslog.d/*.conf`, and `/etc/systemd/journald.conf`, which configure logging daemons rather than logrotate policies. Changed the files to `/etc/logrotate.conf` and `/etc/logrotate.d/*`.
- The post implied journald logs are handled by logrotate. Clarified that logrotate manages text log files and that journald retention is configured separately in `journald.conf`.
- The restart instructions used `rsyslog` and `systemd-journald`. Replaced them with enabling and starting `logrotate.timer`, which is how RHEL 9 schedules logrotate.
- The verification commands checked `rsyslog` and `systemd-journald` status and generic logs. Replaced them with `systemctl status logrotate.timer`, `logrotate -d /etc/logrotate.conf`, and the logrotate state file.
- The firewall step implied log rotation might require opening port 514. Clarified that logrotate itself does not require firewall changes and that port 514 applies only when receiving remote syslog messages. Added UDP alongside TCP because syslog receivers commonly use either protocol depending on configuration.
- The troubleshooting section used `rsyslogd -N1`, which validates rsyslog configuration rather than logrotate configuration. Replaced it with `logrotate -d /etc/logrotate.conf`.

## Review Notes
The corrected post is now technically aligned with logrotate on RHEL 9. Future improvements could include showing how to force a one-time rotation with `logrotate -f` and how to use `postrotate` to signal services that keep log files open.
