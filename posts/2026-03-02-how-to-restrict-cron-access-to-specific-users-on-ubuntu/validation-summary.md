# Validation Summary: How to Restrict Cron Access to Specific Users on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (Debian-based cron package)
- cron / crontab
- /etc/cron.allow and /etc/cron.deny access control
- /etc/cron.d/ system crontabs
- PAM (Pluggable Authentication Modules), specifically pam_succeed_if
- at command (/etc/at.allow, /etc/at.deny)
- systemd journal (journalctl -u cron)
- syslog (/var/log/syslog)

## Sources Consulted
- Debian cron source code (`allowed()` function in `misc.c`): https://salsa.debian.org/debian/cron/-/blob/master/misc.c
- Debian cron root-bypass patch: https://salsa.debian.org/debian/cron/-/blob/master/debian/patches/fixes/crontab-allow-deny-logic-fix.patch
- Debian cron `crontab(1)` man page: https://manpages.debian.org/trixie/cron/crontab.1.en.html
- Debian cron `cron.service` unit file: https://salsa.debian.org/debian/cron/-/blob/master/debian/cron.service
- `pam_succeed_if(8)` man page: https://man7.org/linux/man-pages/man8/pam_succeed_if.8.html
- Debian bug 383741 (cron allow/deny semantics)

## Issues Found

1. **Incorrect claim about empty cron.allow file.** The original logic point 4 stated: "If both files are empty or `/etc/cron.deny` is empty with no `/etc/cron.allow`: Everyone can use cron." This is wrong. Per the Debian cron `allowed()` function, if `/etc/cron.allow` exists (even empty), `in_file()` returns FALSE for every non-root user — i.e. an empty `cron.allow` denies everyone except root. Replaced point 4 with two separate, accurate cases: one for empty/absent `cron.deny` with no `cron.allow` (everyone allowed), and a new point 5 explaining that an empty `cron.allow` denies all non-root users.

2. **Incorrect claim that root would be denied if missing from cron.allow.** The original note read: "If root is not listed and `cron.allow` exists, even root will be denied." This is not true on Debian/Ubuntu — the Debian cron package applies a patch (`crontab-allow-deny-logic-fix.patch`) that explicitly returns TRUE for root at the top of the `allowed()` function. The man page also states root is always allowed. Rewrote this note to accurately describe Debian/Ubuntu behavior while preserving the original (still-good) recommendation to list root explicitly for clarity and portability to non-Debian implementations like cronie.

3. **Misleading PAM comment about root.** The original comment on the `pam_succeed_if` rule said: "Only allow users in the cron-users group or root." `pam_succeed_if` does NOT special-case root — it tests root's group membership the same as any other user. As written, the rule would block root's own cron jobs unless root is also added to the `cron-users` group. Updated the comment to make this explicit so readers don't accidentally lock out root.

## Review Notes

- The PAM section (`/etc/pam.d/cron`) controls cron *job execution* (when cron invokes PAM as it runs jobs), not the `crontab` command itself. The post's wording is technically correct but a reader could mistake PAM restrictions as a way to block users from editing crontabs. The post's existing caveat ("more complex and less portable than cron.allow/cron.deny. Test changes carefully") mitigates this, so no edit was made.
- On Ubuntu 24.04, `/var/log/syslog` is no longer created by default — only `journalctl` is reliable. The post helpfully shows both, so this is not an error, but readers on 24.04+ should default to the `journalctl` command.
- The audit loop `for user in $(sudo ls /var/spool/cron/crontabs/); do ...` relies on word-splitting and would misbehave for usernames containing whitespace. Usernames on POSIX systems should not contain whitespace, so this is acceptable in practice — not a correctness issue.
- All file paths (`/etc/cron.allow`, `/etc/cron.deny`, `/etc/cron.d/`, `/var/spool/cron/crontabs/`, `/etc/pam.d/cron`, `/etc/at.allow`, `/etc/at.deny`) match Debian/Ubuntu conventions.
- The error message "You (username) are not allowed to use this program (crontab)" matches the actual Debian cron source.
- `journalctl -u cron` is correct — the Debian/Ubuntu unit file is named `cron.service`.
