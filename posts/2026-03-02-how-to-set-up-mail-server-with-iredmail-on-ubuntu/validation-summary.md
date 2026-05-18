# Validation Summary: How to Set Up Mail Server with iRedMail on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iRedMail (1.7.0 → updated to 1.8.1)
- Ubuntu 22.04 / 24.04 LTS
- Postfix (SMTP MTA)
- Dovecot (IMAP/POP3)
- amavisd-new (DKIM, content filtering)
- SpamAssassin
- ClamAV
- MariaDB / PostgreSQL / OpenLDAP (backend options)
- Nginx / Apache (web server options)
- iRedAdmin (web admin panel)
- SOGo, Roundcube (webmail/groupware)
- iRedAPD (Postfix policy daemon)
- Fail2Ban
- Let's Encrypt / certbot
- SPF, DKIM, DMARC (email authentication)
- swaks (SMTP test tool)
- Spamhaus DNSBL

## Sources Consulted
- iRedMail documentation: https://docs.iredmail.org/
- iRedMail GitHub releases / tags: https://github.com/iredmail/iRedMail/tags
- iRedMail tools directory: https://github.com/iredmail/iRedMail/tree/master/tools
- `create_mail_user_SQL.sh` source: https://github.com/iredmail/iRedMail/blob/master/tools/create_mail_user_SQL.sh
- Dovecot password schemes (SSHA512 / `doveadm pw`)
- MySQL/MariaDB `ENCRYPT()` documentation (deprecated in MySQL 5.7, removed in 8.0; uses Unix crypt())
- RFC 7208 (SPF), RFC 6376 (DKIM), RFC 7489 (DMARC) for record syntax
- Postfix `postconf` / `postqueue` / `postsuper` documentation
- swaks man page for `--auth`, `--tls`, `--server` flags
- Spamhaus DNSBL reverse-IP query format

## Issues Found

1. **Outdated iRedMail version (1.7.0).** As of 2026-05-18, the current stable release is 1.8.1 (released 2026-05-14). Updated the wget URL, tarball filename, and extracted directory name throughout the "Installing iRedMail" section to use 1.8.1.

2. **Incorrect SQL user-creation example using MySQL `ENCRYPT()`.** iRedMail uses Dovecot's `SSHA512` password scheme by default (it also supports BCRYPT / SSHA / PLAIN via `doveadm pw`). MySQL's `ENCRYPT()` function produces a Unix crypt() hash that Dovecot will not be able to verify with the default scheme, so users created via the raw INSERT would be unable to log in. `ENCRYPT()` is also deprecated in MySQL 5.7 and removed in MySQL 8.0. Additionally, the `mailbox` table has several NOT NULL columns (e.g. `storagebasedirectory`, `storagenode`) the example omitted. Replaced the raw INSERT block with the iRedMail-recommended approach: run `tools/create_mail_user_SQL.sh` (bundled with the iRedMail source) to generate properly hashed, schema-complete SQL, then import it into the `vmail` database.

## Review Notes

- The DNS examples (SPF / MX / A / PTR / DMARC / DKIM record at `dkim._domainkey.example.com`) all use correct syntax and the default iRedMail DKIM selector.
- Reversed-IP Spamhaus query format (`1.113.0.203.zen.spamhaus.org`) is correct. Note that Spamhaus blocks queries from many public DNS resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1, etc.); production use of their public DNSBL from a busy resolver may require their authenticated Data Query Service. Not a correctness issue, but worth keeping in mind.
- `/etc/nginx/templates/ssl.tmpl`, `/etc/amavis/conf.d/50-user`, and `/etc/dovecot/dovecot.conf` paths are all correct for iRedMail on Ubuntu.
- The swaks invocation (`--server mail.example.com:587 --auth PLAIN --tls`) is correct - `--tls` triggers STARTTLS, which is appropriate for the submission port.
- 4GB RAM minimum is reasonable but tight when ClamAV + SpamAssassin + amavisd are all running; the 8GB recommendation is sensible.
- Port 465 (SMTPS / implicit TLS submission) is not listed in firewall requirements. iRedMail enables it by default in recent versions, and some MUAs prefer it over 587/STARTTLS, but the post's 25/587/993/995 set is the conventional minimum and works for most clients. Left unchanged - not strictly an error.
- The Let's Encrypt deployment hook (`/etc/letsencrypt/renewal-hooks/deploy/restart-mail.sh`) is the correct mechanism and path for certbot post-renewal actions.
