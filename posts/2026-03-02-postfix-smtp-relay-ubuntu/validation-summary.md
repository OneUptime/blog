# Validation Summary: How to Configure Postfix as an SMTP Relay on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Postfix (MTA)
- Ubuntu (apt, systemctl)
- SASL authentication
- TLS for SMTP
- mailutils (`mail` command)
- pflogsumm (log analysis)
- Shell utilities (nc, grep, cron)

## Sources Consulted
- Postfix main.cf parameter documentation: https://www.postfix.org/postconf.5.html
- Postfix SASL README: https://www.postfix.org/SASL_README.html
- Postfix TLS README: https://www.postfix.org/TLS_README.html
- Postfix `postsuper(1)` man page: https://www.postfix.org/postsuper.1.html
- Postfix `postqueue(1)` man page: https://www.postfix.org/postqueue.1.html
- Postfix `postcat(1)` man page: https://www.postfix.org/postcat.1.html
- Postfix `postmap(1)` man page: https://www.postfix.org/postmap.1.html
- Ubuntu package repository (pflogsumm, postfix, mailutils packages)
- Postfix STANDARD_CONFIGURATION_README: https://www.postfix.org/STANDARD_CONFIGURATION_README.html

## Issues Found
No technical issues found.

All Postfix directives (`myhostname`, `mydomain`, `myorigin`, `inet_interfaces`, `mydestination`, `relayhost`, `smtp_sasl_auth_enable`, `smtp_sasl_password_maps`, `smtp_sasl_security_options`, `smtp_tls_security_level`, `smtp_tls_CAfile`, `smtp_tls_loglevel`, `debug_peer_level`, `mynetworks`, `sender_canonical_maps`, `smtpd_tls_cert_file`, `smtpd_tls_key_file`, `smtpd_tls_security_level`, `smtp_header_checks`) are valid current Postfix parameters with correct value types.

The bracket syntax `[smtp.example.com]:587` for `relayhost` is correctly described as suppressing MX lookup. The SASL `sasl_passwd` file format is correct (`[host]:port  user:pass`), and the `postmap` workflow is accurate. Queue management commands (`mailq`, `postqueue -p`, `postqueue -f`, `postsuper -d ALL`, `postsuper -d ALL deferred`, `postsuper -d MESSAGEID`, `postcat -q`) are correct. The `pflogsumm` package name is correct on Ubuntu. The mail log location `/var/log/mail.log` is correct for default rsyslog-based Ubuntu setups. The `nc -z -w3` flags and cron syntax are valid.

## Review Notes
- SASL PLAIN/LOGIN authentication to a relay on Ubuntu typically requires the `libsasl2-modules` package to be installed (otherwise Postfix may fail with "no mechanism available"). The post does not mention this prerequisite. It is an omission rather than an error, so I did not modify the content.
- The comment "Check why a specific message is deferred" above `postcat -q MESSAGEID` is slightly imprecise — `postcat -q` displays the queue file contents (headers/body), whereas the actual deferred reason is typically found in `/var/log/mail.log` or under `/var/spool/postfix/defer/`. The command itself is valid for inspecting queued messages, so I left it as written.
- On Ubuntu releases that route logs solely through `systemd-journald` without a syslog daemon, `/var/log/mail.log` may not exist; users would need `journalctl -u postfix` instead. Default Ubuntu Server installs still include rsyslog, so the post's guidance remains correct for the common case.
- `smtp_header_checks` (used in the Header Cleanup section) requires Postfix 2.5 or later, which is well below any currently supported Ubuntu version, so no compatibility concern.
