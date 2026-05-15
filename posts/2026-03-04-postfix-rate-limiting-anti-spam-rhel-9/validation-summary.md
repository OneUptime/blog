# Validation Summary: How to Configure Postfix Rate Limiting and Anti-Spam on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix SMTP server
- Postfix SMTP access restrictions
- Postfix anvil rate limiting
- DNS blocklists
- Postgrey greylisting
- Postfix access, CIDR, header, and body check tables
- systemd and DNF

## Sources Consulted
- Postfix Configuration Parameters: https://www.postfix.org/postconf.5.html
- Postfix Performance Tuning: https://www.postfix.org/TUNING_README.html
- Postfix SMTP Relay and Access Control: https://www.postfix.org/SMTPD_ACCESS_README.html
- Postfix anvil(8) manual: https://www.postfix.org/anvil.8.html
- Postfix access(5) manual: https://www.postfix.org/access.5.html
- Postfix cidr_table(5) manual: https://www.postfix.org/cidr_table.5.html
- Postfix smtpd(8) manual: https://www.postfix.org/smtpd.8.html
- Postfix header_checks(5) manual: https://www.postfix.org/header_checks.5.html
- Postfix postfix(1) command manual: https://www.postfix.org/postfix.1.html
- Red Hat Enterprise Linux 9 Deploying mail servers documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Fedora Packages postgrey package page: https://packages.fedoraproject.org/pkgs/postgrey/postgrey

## Issues Found
- The client access example used `hash:/etc/postfix/client_access` for both an exact IP address and a CIDR network entry. Postfix `hash:` access maps are appropriate for exact access-table keys, while CIDR ranges should use the `cidr:` table type. I split the example into `/etc/postfix/client_access` for exact IPs and `/etc/postfix/client_cidr_access` for networks, noted that the CIDR table does not need `postmap`, and added `check_client_access cidr:/etc/postfix/client_cidr_access` to the restriction list.
- The monitoring section described `sudo postfix status` as viewing anvil rate limit statistics. The `postfix status` command reports Postfix service status, while anvil peak usage information is logged by the anvil service. I changed the comment to say it checks Postfix status and recent anvil logs.
- The rejection-count example claimed to count rejections in the last hour, but a plain `grep` over `/var/log/maillog` counts matches in the current log file, not a one-hour time window. I changed the comment to accurately describe the command.

## Review Notes
- The Postfix rate-limit parameters, HELO/sender/recipient/client restrictions, RBL syntax, message size and recipient limits, header/body check syntax, `postmap`, `postfix check`, and `postfix reload` examples are consistent with Postfix documentation.
- `postgrey` is available from Fedora EPEL 9 rather than base RHEL repositories. The `dnf install postgrey` command is valid when EPEL is enabled, but a future revision could mention that prerequisite explicitly.
