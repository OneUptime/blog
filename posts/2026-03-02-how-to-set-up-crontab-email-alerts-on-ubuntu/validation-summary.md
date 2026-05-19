# Validation Summary: How to Set Up Crontab Email Alerts on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- cron / crontab (Vixie cron on Ubuntu)
- Postfix MTA (with Gmail SMTP relay)
- SASL authentication (libsasl2-modules)
- mailutils (`mail`, `mailq`)
- msmtp / msmtp-mta (lightweight sendmail replacement)
- Gmail SMTP relay (smtp.gmail.com:587, STARTTLS, App Passwords)
- Bash wrapper scripts for failure-only notifications

## Sources Consulted
- Postfix documentation — SASL Howto and STARTTLS configuration (https://www.postfix.org/SASL_README.html, https://www.postfix.org/TLS_README.html)
- Debian/Ubuntu crontab(5) man page (https://manpages.debian.org/bookworm/cron/crontab.5.en.html)
- Vixie cron environment-variable handling (env lines apply to subsequent job entries)
- Google account help — Sign in with App Passwords (https://support.google.com/accounts/answer/185833)
- msmtp documentation (https://marlam.de/msmtp/documentation/) and the Debian `msmtp-mta` package, which installs `/usr/sbin/sendmail` as a wrapper around msmtp
- GNU mailutils `mail` man page (`-u USER`, `-s SUBJECT` flags)
- apt(8) — behavior of `apt list --upgradable` and the unstable-CLI warning to stderr

## Issues Found
No technical issues found.

Spot checks that passed:
- `relayhost = [smtp.gmail.com]:587` — square brackets correctly disable MX lookup for the host.
- `smtp_sasl_security_options = noanonymous` — required for Gmail relay; the Postfix default of `noplaintext, noanonymous` would block PLAIN/LOGIN over STARTTLS.
- `smtp_tls_security_level = encrypt` and `smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt` — valid Postfix settings and the correct CA bundle path on Ubuntu (ca-certificates package).
- `postmap /etc/postfix/sasl_passwd` — correct way to build the hash database; chmod 600 before postmap is appropriate since the resulting `.db` will mirror the source file's protection model.
- Multiple `MAILTO=` entries in a single crontab — Vixie cron parses env lines in order and snapshots the env per job, so per-section MAILTO does work as described.
- Wrapper script — `OUTPUT=$("$@" 2>&1)` and `EXIT_CODE=$?` correctly preserve arguments and capture the exit status; emitting output only on non-zero exit is the standard pattern for failure-only cron mail.
- `/etc/cron.d/` file format — includes the user field (`root`) as required by system crontab format, distinct from user crontabs.
- `apt list --upgradable 2>/dev/null` — correctly suppresses the "WARNING: apt does not have a stable CLI interface" message that apt writes to stderr.
- `msmtp-mta` — the Debian/Ubuntu package does provide `/usr/sbin/sendmail` as a symlink to msmtp, so cron picks it up without further configuration.
- msmtp config (`defaults` block, `account gmail`, `account default : gmail`) — matches the documented msmtprc syntax.

## Review Notes
- The post uses `telnet smtp.gmail.com 587` to test connectivity. Telnet is not installed by default on modern Ubuntu Server; `nc -vz smtp.gmail.com 587` or `openssl s_client -starttls smtp -connect smtp.gmail.com:587` would be more reliable, but the telnet example is not incorrect and is still widely understood.
- `chmod 600 /etc/msmtprc` makes the file readable only by root. This is fine for cron jobs running as root, but non-root users running cron jobs that rely on the system msmtprc would not be able to read it. Users in that situation typically put a per-user `~/.msmtprc` in place. Not an error in the post since it is presented as a system-wide setup.
- `ssmtp` is mentioned in the section heading "Alternative: Using ssmtp or msmtp for Simple Relay" but only msmtp is configured. This is fine because ssmtp has been unmaintained for years and removed from recent Debian/Ubuntu releases; the post correctly steers readers to msmtp.
- The Google App Passwords navigation path ("myaccount.google.com > Security > 2-Step Verification > App passwords") is accurate as of the review date; the direct URL is `https://myaccount.google.com/apppasswords`.
- The wrapper script `cron-alert-on-failure` only forwards args; commands needing shell features (pipes, redirections, globs) would need to be wrapped in `bash -c '...'` when invoked. The post's examples (`backup-databases.sh`, `rsync -az ...`) do not need this, so the example is consistent.
