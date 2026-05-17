# Validation Summary: How to Set Up Postfix with Gmail SMTP Relay on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Postfix (mail transfer agent)
- Ubuntu (Linux distribution)
- Gmail SMTP relay (`smtp.gmail.com:587`)
- Google Workspace SMTP relay (`smtp-relay.gmail.com:587`)
- SASL authentication (Cyrus SASL via `libsasl2-modules`)
- TLS / STARTTLS (and `smtp_tls_wrappermode` for implicit TLS on port 465)
- Google App Passwords (with 2FA requirement)
- `mailutils` (`mail` command)
- systemd (`systemctl`) for service management

## Sources Consulted
- Postfix `postconf(5)` parameter reference: https://www.postfix.org/postconf.5.html (verified `smtp_sasl_*`, `smtp_tls_security_level`, `smtp_tls_mandatory_protocols`, `smtp_tls_mandatory_ciphers`, `smtp_tls_wrappermode`, `sender_canonical_maps`, `relayhost`)
- Postfix TLS Readme: https://www.postfix.org/TLS_README.html (confirmed that with `smtp_tls_security_level = encrypt`, the mandatory_* TLS variants are the effective parameters)
- Postfix SASL Readme: https://www.postfix.org/SASL_README.html (verified hash map format for `sasl_passwd` and `postmap` usage)
- Google Account Help — App Passwords: https://support.google.com/accounts/answer/185833 (confirmed 16-character format, 2FA requirement, deprecation of "less secure app" access)
- Google Workspace Admin Help — SMTP relay service: https://support.google.com/a/answer/2956491 (confirmed `smtp-relay.gmail.com` endpoint and IP-based authentication option)
- Google Workspace sending limits: https://support.google.com/a/answer/166852 (confirmed ~2,000/day SMTP relay limit for Workspace, ~500/day for personal Gmail)
- Ubuntu package list for `postfix`, `libsasl2-modules`, and `mailutils` (all valid in current Ubuntu releases)

## Issues Found
1. **Incorrect TLS parameter scope** (fixed). The original config set `smtp_tls_protocols = !SSLv2, !SSLv3` and `smtp_tls_ciphers = high`. These two parameters apply to **opportunistic** TLS only. Because the post sets `smtp_tls_security_level = encrypt` (mandatory TLS), those settings would not actually be enforced on the Gmail connection. I updated them to the mandatory variants — `smtp_tls_mandatory_protocols` and `smtp_tls_mandatory_ciphers` — and added a brief comment explaining why, so the "modern TLS only" guarantee the author claims is actually achieved.

## Review Notes
- The rest of the configuration (relay host, SASL auth, password map format, `postmap` workflow, file permissions of `600` on `sasl_passwd`, `sender_canonical_maps`, port 465 + `smtp_tls_wrappermode = yes` as a fallback) is consistent with the Postfix documentation and works on current Ubuntu LTS releases.
- The App Password flow is current as of 2026: Google still requires 2-Step Verification before App Passwords can be created, and "less secure app" access has been removed for personal Gmail accounts.
- The cited rate limits (500/day personal Gmail, ~2,000/day Workspace) match Google's published limits, but Google adjusts these from time to time and Workspace plans vary — the post correctly notes "varies by plan".
- The log path `/var/log/mail.log` is correct for Ubuntu's default rsyslog configuration. On systems that have moved exclusively to `journald`, `journalctl -u postfix` would be the alternative, but this is not in error — Ubuntu still ships rsyslog and `mail.log` by default.
- Minor non-issue: `smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache` is the Postfix-recommended form and uses Postfix's built-in `${data_directory}` expansion.
