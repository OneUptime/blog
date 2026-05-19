# Validation Summary: How to Set Up Cron Job Email Notifications on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Cron (Vixie cron / cronie on Ubuntu)
- Postfix MTA
- ssmtp
- msmtp
- Gmail SMTP relay (smtp.gmail.com:587)
- SASL authentication
- TLS / STARTTLS
- Bash wrapper scripts
- mailutils (mail command)

## Sources Consulted
- Postfix documentation: http://www.postfix.org/postconf.5.html (relayhost, smtp_sasl_*, smtp_tls_security_level)
- Postfix SASL_README: http://www.postfix.org/SASL_README.html
- Ubuntu Server Guide — Postfix: https://ubuntu.com/server/docs/mail-postfix
- msmtp documentation: https://marlam.de/msmtp/msmtprc.5.html (tls, tls_starttls defaults, auth)
- ssmtp(8) and ssmtp.conf(5) manual pages (UseTLS, UseSTARTTLS behavior)
- crontab(5) manual page (MAILTO variable behavior, system crontab format with user field)
- cron(8) manual page (environment variables passed to jobs)
- Google Workspace docs on App Passwords for SMTP relay
- Ubuntu packages: packages.ubuntu.com for postfix, mailutils, ssmtp, msmtp availability

## Issues Found
No technical issues found. Verified items in detail:
- `relayhost = [smtp.gmail.com]:587` — bracket syntax correctly disables MX lookup (per Postfix docs).
- `smtp_tls_security_level = encrypt` is a valid Postfix value that requires TLS.
- `smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt` matches Ubuntu's ca-certificates package layout.
- `sasl_passwd` format `[smtp.gmail.com]:587 user:pass` followed by `postmap` is the documented procedure.
- File permissions `chmod 600` for `sasl_passwd` and `chmod 640` for `msmtprc`/`ssmtp.conf` are appropriate.
- For ssmtp with Gmail port 587, setting both `UseSTARTTLS=YES` and `UseTLS=YES` is the standard documented pattern (UseTLS enables TLS support, UseSTARTTLS specifies the STARTTLS mechanism).
- msmtp with `tls on` and port 587 uses STARTTLS by default (since `tls_starttls` defaults to `on`).
- `/etc/cron.d/` files require the user field after time spec — the example correctly includes `myapp` and `root` user fields.
- MAILTO is parsed by cron from the crontab and is passed to job environments on Linux cron implementations, so the `${MAILTO:-root}` fallback in the wrapper scripts will work as written.
- `mail -s "subject" recipient` syntax from mailutils is correct.
- `postqueue -p` / `postqueue -f` / `mailq` commands are accurate.
- Cron schedule expressions (`0 2 * * *`, `*/5 * * * *`) are valid.

## Review Notes
- ssmtp is no longer actively maintained upstream and has been removed from the default repositories in some newer Ubuntu releases (notably from 24.04 onward). The post already mitigates this by introducing msmtp as the "Modern Alternative" — readers on the newest Ubuntu LTS should prefer the msmtp section.
- The Postfix section uses `sudo tee /etc/postfix/main.cf << 'EOF'` which overwrites the entire main.cf shipped by the package. This works for a pure relay/satellite host but discards Ubuntu's default settings (e.g., `inet_interfaces = loopback-only` from the satellite preset). Using `postconf -e` to set individual parameters would be a more conservative approach in mixed environments; this is a best-practice note rather than a correctness issue.
- In `cron-mailer.sh`, the line `COMMAND="$@"` assigns the joined positional parameters to a variable that is never read afterward. It is harmless but dead code.
- The OneUptime heartbeat URL `https://oneuptime.com/api/monitor/heartbeat/YOUR-KEY` is illustrative; readers should confirm the current endpoint path in their OneUptime dashboard.
- Port 465 with SSL is correctly suggested as a fallback when 587 is blocked; if a reader switches to 465 they would need to use `smtp_tls_wrappermode = yes` in Postfix or `tls_starttls off` in msmtp.
