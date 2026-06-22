# Validation Summary: How to Set Up iRedMail on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- iRedMail
- Postfix
- Dovecot
- Nginx
- MariaDB
- Roundcube
- SOGo
- Amavisd-new
- SpamAssassin
- ClamAV
- iRedAPD
- Fail2ban
- Certbot / Let's Encrypt
- DNS email authentication records: SPF, DKIM, DMARC

## Sources Consulted
- iRedMail download page: https://www.iredmail.org/download.html
- iRedMail install guide for Debian/Ubuntu: https://docs.iredmail.org/install.iredmail.on.debian.ubuntu.html
- iRedMail Let's Encrypt guide: https://docs.iredmail.org/letsencrypt.html
- iRedMail SQL create mail user guide: https://docs.iredmail.org/sql.create.mail.user.html
- iRedMail SQL mail alias guide: https://docs.iredmail.org/sql.create.mail.alias.html
- iRedMail SQL catch-all guide: https://docs.iredmail.org/sql.create.catch-all.html
- iRedMail iRedAPD management guide: https://docs.iredmail.org/manage.iredapd.html
- iRedMail 1.8.2 source archive and bundled sample configs/scripts: https://github.com/iredmail/iRedMail/archive/refs/tags/1.8.2.tar.gz

## Issues Found
- The post listed Ubuntu 20.04 and hard-coded iRedMail 1.7.1 as the latest release. Updated the supported Ubuntu list and examples to iRedMail 1.8.2, matching the current iRedMail download page.
- The prerequisite package list installed `bzip2` for a `.tar.gz` archive and omitted `dialog`. Replaced it with `gzip` and `dialog`.
- The hostname and `/etc/hosts` guidance did not match iRedMail's Debian/Ubuntu install guide. Updated the example to use a short hostname and put the FQDN first in `/etc/hosts`.
- The download path used `/tmp` while later instructions referenced `/root`. Made the install path consistent with `/root/iRedMail-1.8.2`.
- The SOGo snippet included unsupported settings such as `SOGoEASyncEnable`. Removed invalid SOGo keys from the example.
- The domain SQL example used `transport='virtual'` and described quota units incorrectly. Updated transport to `dovecot` and quota comments/values to bytes.
- The user SQL example included columns that are not in the current iRedMail schema and missed required helper-generated fields. Replaced it with iRedMail's official `create_mail_user_SQL.sh` workflow.
- The alias and catch-all SQL examples used the obsolete `alias.goto` pattern. Updated them to use `alias` plus `forwardings`, and the current catch-all pattern from iRedMail docs.
- The Let's Encrypt section used standalone Certbot and direct service config edits. Replaced it with iRedMail's webroot flow and symlink-based certificate setup for Ubuntu.
- The SpamAssassin path and restart command were wrong for iRedMail on Ubuntu. Updated the path to `/etc/mail/spamassassin/local.cf` and restarted `amavis`.
- The greylisting section used unsupported `settings.py` variables. Replaced it with the documented `greylisting_admin.py` commands.
- The backup script referenced obsolete/nonexistent iRedMail paths and used a cleanup command that could match the backup root directory. Updated paths and added `-mindepth 1`.

## Review Notes
The tutorial is validated after corrections. Some operational recommendations, such as using iRedAdmin/iRedAdmin-Pro instead of direct SQL for routine account management, could be expanded in a future editorial pass, but the corrected command examples now match current iRedMail documentation and bundled schema/scripts.
