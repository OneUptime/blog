# Validation Summary: How to Manage System Logs with journald and rsyslog on RHEL

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journalctl
- rsyslog
- logrotate
- logger
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring basic system settings, Chapter 6 "Troubleshooting problems by using log files": https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/configuring_basic_system_settings/Red_Hat_Enterprise_Linux-9-Configuring_basic_system_settings-en-US.pdf
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- rsyslog configuration documentation: https://docs.rsyslog.com/doc/configuration/index.html
- rsyslog imtcp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog omfile module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfile.html
- rsyslog omfwd module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- logrotate manual: https://man7.org/linux/man-pages/man8/logrotate.8.html
- logger manual: https://man7.org/linux/man-pages/man1/logger.1.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The comment above the `*.info;mail.none;authpriv.none;cron.none /var/log/messages` rsyslog selector incorrectly said it logged all kernel messages. Changed it to describe the actual selector: informational and higher-priority messages except mail, authpriv, and cron.
- The remote receiver section said to enable TCP or UDP reception, but the provided configuration loads only `imtcp` and listens with `input(type="imtcp" port="514")`. Changed the sentence to say TCP reception.
- The journal cleanup comments implied `journalctl --vacuum-time` and `--vacuum-size` remove arbitrary entries or all journal files. Changed them to state that these options operate on archived journal files, matching the journalctl documentation.

## Review Notes
The commands and configuration snippets are otherwise technically valid for the RHEL 9 logging workflow described. For production remote logging, the rsyslog documentation recommends TCP with TLS or RELP when transport security or stronger delivery guarantees are required; the post's plain TCP example is acceptable as a basic setup but should not be treated as a hardened production configuration.
