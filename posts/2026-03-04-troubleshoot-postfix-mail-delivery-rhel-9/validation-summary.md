# Validation Summary: How to Troubleshoot Postfix Mail Delivery Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- systemd journal and rsyslog mail logging
- DNS MX, A, PTR, and DNSBL lookups
- SMTP delivery testing
- Postfix queue and configuration tools

## Sources Consulted
- Red Hat Enterprise Linux 9 Deploying mail servers documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/index
- Postfix DEBUG_README: https://www.postfix.org/DEBUG_README.html
- Postfix postqueue(1): https://www.postfix.org/postqueue.1.html
- Postfix postcat(1): https://www.postfix.org/postcat.1.html
- Postfix postsuper(1): https://www.postfix.org/postsuper.1.html
- Postfix qshape(1) and QSHAPE_README: https://www.postfix.org/qshape.1.html and https://www.postfix.org/QSHAPE_README.html
- Postfix postconf(1) and postconf(5): https://www.postfix.org/postconf.1.html and https://www.postfix.org/postconf.5.html
- Postfix postmap(1) and DATABASE_README: https://www.postfix.org/postmap.1.html and https://www.postfix.org/DATABASE_README.html
- Postfix TLS_README: https://www.postfix.org/TLS_README.html
- RFC 5321 Simple Mail Transfer Protocol: https://www.rfc-editor.org/rfc/rfc5321

## Issues Found
- The `qshape deferred` command was described as showing queue count and size. Postfix documents `qshape` as showing queue distribution by age and destination, so the comment was corrected to "Show queue age and destination distribution."
- The article stated that every message gets a queue ID. SMTP rejects can occur before a message is queued, so this was narrowed to "Every queued message gets a unique queue ID."
- The DNS diagnostic command `postmap -q "remote.com" dns:mx` used an unsupported Postfix lookup table form. Postfix lookup tables are limited to supported map types, and `dns:mx` is not a valid map type. The example was replaced with `dig A mx.remote.com` after the MX lookup.
- The `postqueue -s example.com` comment implied all specific-domain retries work unconditionally. Postfix documents `-s site` as using the fast flush service for eligible sites, so the comment was updated to mention fast-flush eligibility.

## Review Notes
The remaining commands and snippets are technically sound for a RHEL/Postfix troubleshooting guide. `/var/log/maillog` depends on the system's logging configuration, but Red Hat documentation still directs administrators to check it for Postfix errors, and the post also includes `journalctl`.
