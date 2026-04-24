# Validation Summary: How to Configure Postfix as a Send-Only SMTP Server on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP
- IPv4
- Linux package management (`apt`, `dnf`)
- systemd
- SMTP relay authentication and TLS

## Sources Consulted
- Postfix Standard Configuration Examples: https://www.postfix.org/STANDARD_CONFIGURATION_README.html
- Postfix Configuration Parameters (`postconf(5)`): https://www.postfix.org/postconf.5.html
- Postfix `sendmail(1)` manual: https://www.postfix.org/sendmail.1.html
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html
- Postfix Debugging Howto: https://www.postfix.org/DEBUG_README.html
- Red Hat documentation, installing packages with `dnf`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/installing-rhel-content
- Local CLI help: `apt --help`
- Local CLI help: `systemctl --help`

## Issues Found
1. **Test-mail command depended on a non-Postfix utility**: The original example used `mail -s ...`, but Postfix does not provide the `mail` command. Replaced it with a `sendmail -t` example that uses Postfix's documented Sendmail-compatible interface.

2. **Mail log path was presented as universal**: The original example only showed `/var/log/mail.log`, but Postfix documents that syslog-backed mail logs vary by distribution. Kept the Debian/Ubuntu path and clarified that RHEL/Rocky commonly uses `/var/log/maillog`.

3. **Smart-host SASL/TLS setting was not the documented client-side pattern**: Changed `smtp_sasl_security_options = noanonymous` to `smtp_sasl_tls_security_options = noanonymous` so plaintext SASL mechanisms are allowed only within a TLS-encrypted SMTP session, matching Postfix's documented relay configuration pattern when `smtp_tls_security_level = encrypt` is used.

4. **`postmap` command did not match the explicit map type in the config**: The post configured `smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd` but used `postmap /etc/postfix/sasl_passwd`, which relies on the system's default database type. Changed it to `postmap hash:/etc/postfix/sasl_passwd` so the command matches the configured lookup type explicitly.

5. **Relay restriction comment was imprecise**: The comment above `smtpd_relay_restrictions` said "Reject all other connections", but that parameter controls relay authorization at RCPT time rather than TCP listener binding. Updated the comment to describe relay behavior accurately.

## Review Notes
- The core send-only or "null client" pattern is technically sound and aligns with Postfix's standard configuration guidance: `inet_interfaces = loopback-only` and `mydestination =` are appropriate for a host that only sends mail.
- `smtp_bind_address` is a valid Postfix SMTP client parameter for forcing outbound delivery to use a specific IPv4 source address.
- `systemctl reload postfix` is valid on systemd-based distributions, although Postfix upstream documentation most often demonstrates `postfix reload`.
- Postfix logs to syslog by default, so exact log file names depend on the distro's syslog or rsyslog configuration.
