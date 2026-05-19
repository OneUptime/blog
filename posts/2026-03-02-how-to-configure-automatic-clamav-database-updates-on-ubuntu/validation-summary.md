# Validation Summary: How to Configure Automatic ClamAV Database Updates on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- ClamAV
- freshclam
- systemd services and timers
- cron
- OneUptime monitoring

## Sources Consulted
- ClamAV FreshClam FAQ: https://docs.clamav.net/faq/faq-freshclam.html
- ClamAV configuration documentation: https://docs.clamav.net/manual/Usage/Configuration.html
- ClamAV private database mirror documentation: https://docs.clamav.net/appendix/CvdPrivateMirror.html
- Ubuntu freshclam manpage: https://manpages.ubuntu.com/manpages/noble/man1/freshclam.1.html
- Ubuntu freshclam.conf manpage: https://manpages.ubuntu.com/manpages/noble/man5/freshclam.conf.5.html
- Ubuntu package details for clamav: https://packages.ubuntu.com/noble/clamav
- Ubuntu Community Help Wiki for ClamAV: https://help.ubuntu.com/community/ClamAV

## Issues Found
- The baseline configuration listed both `db.local.clamav.net` and `database.clamav.net`. Current Ubuntu/ClamAV documentation recommends `database.clamav.net` as the worldwide CDN endpoint, so the example now uses only that official CDN hostname.
- The post described 50 checks per day as a mirror limit. The Ubuntu freshclam manpage documents that `--checks` must be between 1 and 50, so the text now describes it as freshclam's supported range.
- The troubleshooting section described `403 Forbidden` as rate limiting. Current ClamAV documentation identifies `429` as the rate-limit signal, while `403` can indicate blocking, an EOL client, or unsupported download behavior. The error list and rate-limiting section were updated accordingly.
- The rate-limiting section suggested switching to a regional mirror. Current ClamAV documentation recommends `database.clamav.net` for the official CDN and `cvdupdate` for private mirrors, so the guidance was corrected.
- The closing statement said definitions are "never more than 2 hours old" with `Checks 12`. That is stronger than freshclam's behavior guarantees; it checks about every 2 hours, but update availability depends on the CDN and database releases. The wording was softened.

## Review Notes
The service commands, freshclam flags, configuration directive names, cron syntax, and systemd timer syntax are technically valid for Ubuntu-packaged ClamAV. The systemd timer example assumes the `clamav` user can write the database directory and update log, which is the normal Ubuntu package setup.
