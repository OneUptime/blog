# Validation Summary: How to Set Up Mail Archiving on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Postfix (main.cf, master.cf, transport_maps, virtual_alias_maps, sender_bcc_maps, recipient_bcc_maps, always_bcc, pipe service)
- Maildir
- MailArchiva Open Source Edition
- Dovecot (mail_log plugin)
- notmuch (email indexer)
- auditd / auditctl / ausearch
- chattr (file immutability)
- cron / cron.d
- swaks (SMTP testing tool)

## Sources Consulted
- Postfix postconf(5) reference for `always_bcc`, `sender_bcc_maps`, `recipient_bcc_maps`, `transport_maps`, `virtual_alias_maps`, `home_mailbox`: https://www.postfix.org/postconf.5.html
- Postfix transport(5) table format: https://www.postfix.org/transport.5.html
- Postfix master(5) and pipe(8) reference for master.cf pipe services: https://www.postfix.org/master.5.html and https://www.postfix.org/pipe.8.html
- Postfix BCC routing readme: https://www.postfix.org/BUILTIN_FILTER_README.html
- Dovecot mail_log plugin docs: https://doc.dovecot.org/configuration_manual/mail_log_plugin/
- notmuch configuration: https://notmuchmail.org/manpages/notmuch-config-1/
- auditctl(8) man page (Linux audit framework)
- swaks documentation: https://www.jetmore.org/john/code/swaks/
- chattr(1) man page

## Issues Found

1. **Approach 2 — invalid transport map syntax**: The original config attempted to use the local user name `mailarchive` as a `transport_maps` lookup key (`mailarchive  local:`). Postfix `transport_maps` keys must be email addresses or domain patterns (per transport(5)), not local user names — the entry would never match. Additionally, `transport_maps` was not needed at all for the described setup: a `virtual_alias_maps` entry mapping `archive@example.com` to a local user plus `home_mailbox = Maildir/` is sufficient to deliver to the local Maildir via Postfix's default local transport. Fix: removed the `transport_maps` configuration and the transport file step from Approach 2, leaving only the virtual alias + `home_mailbox` configuration which correctly delivers to the Maildir.

2. **notmuch initialization ordering**: The original ordering ran `notmuch --config=/etc/notmuch-archive.cfg new` BEFORE the config file was created with `sudo nano /etc/notmuch-archive.cfg`. Since notmuch reads the database path from the config file, the initial `new` invocation would fail because the config did not yet exist. Fix: reordered so that the configuration file is created first, then a single `notmuch new` call both initializes the database and indexes existing messages. Updated the surrounding comments to reflect the new order.

## Review Notes

- **MailArchiva default port**: The post states "MailArchiva listens on a configured SMTP port (default 8090)". Port 8090 is MailArchiva's default web admin UI port; the SMTP archiving listener is a separately configured port. The wording is slightly ambiguous but the surrounding text correctly notes the port is configurable and the Postfix transport entry just points to whatever port is chosen — left unchanged since users will set the port during MailArchiva configuration anyway.
- **MailArchiva installer URL/version**: The exact installer URL `https://www.mailarchiva.com/files/mailarchiva_open_v7.4_unix_installer.sh` was not independently verified; the post correctly tells the reader to "Check https://www.mailarchiva.com for the latest version" so version drift is anticipated.
- **notmuch on flat .eml directories**: notmuch is designed primarily for Maildir-style trees, but will index arbitrary `.eml` files in any directory. The tags described in `[new]` will be applied to all newly seen messages, which is the expected behavior here.
- **Retention calculation**: `RETENTION_DAYS=2557` for "7 years" is essentially correct (7 × 365.25 ≈ 2556.75).
- **Postfix master.cf pipe service**: The 8-column format `mailarchive  unix  -  n  n  -  -  pipe` and the `flags=Fq user=archivist argv=...` continuation line are valid per master(5) / pipe(8).
- **Dovecot mail_log**: The configuration sets `mail_log_events` twice; the second assignment uses `$mail_log_events save` to append `save` to the previously assigned list. This is valid Dovecot config syntax.
- **Audit rules**: `auditctl -w /var/mail/archive -p rwxa -k mail_archive_access` and the corresponding persistent rule in `/etc/audit/rules.d/` are correct, though restarting `auditd` via systemctl is sometimes blocked on stock Ubuntu (some distributions ship a `RefuseManualStop=yes` style unit and require `service auditd restart` or `augenrules --load`). Left unchanged because `systemctl restart auditd` works on current Ubuntu releases.
