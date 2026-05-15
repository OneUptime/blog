# Validation Summary: How to Set Password Expiration and Aging Policies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux password aging
- shadow-utils `chage`
- shadow-utils `useradd`
- `passwd`
- `/etc/login.defs`
- `/etc/default/useradd`
- Bash monitoring scripts
- Compliance-oriented password aging settings

## Sources Consulted
- Red Hat Enterprise Linux documentation: Password Aging: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/system_administration_guide/s2-redhat-config-users-passwd-aging
- Red Hat article: How to set user password expirations on Linux: https://www.redhat.com/en/blog/password-expiration-date-linux
- Linux `chage(1)` manual page: https://www.man7.org/linux/man-pages/man1/chage.1.html
- Linux `login.defs(5)` manual page: https://www.man7.org/linux/man-pages/man5/login.defs.5.html
- Linux `useradd(8)` manual page: https://man7.org/linux/man-pages/man8/useradd.8.html
- Linux `passwd(1)` manual page: https://man7.org/linux/man-pages/man1/passwd.1.html
- OpenSCAP Security Guide for Red Hat Enterprise Linux 9, CIS/PCI/STIG-style password aging rules: https://static.open-scap.org/ssg-guides/

## Issues Found
- The service account section said to "Lock them to password authentication instead," but `passwd -l` disables password authentication by locking the password hash. Changed the wording to "Lock their passwords to disable password authentication instead."
- The monitoring script said it reported passwords expiring within the next 14 days, but the condition also matched already-expired passwords because it only checked `days_left <= WARN_DAYS`. Added `days_left >= 0` to match the stated behavior.

## Review Notes
- The `chage`, `useradd -D -f`, `passwd -l`, and `/etc/login.defs` examples are technically valid for RHEL-style systems using shadow-utils.
- The post correctly notes that `PASS_MAX_DAYS`, `PASS_MIN_DAYS`, and `PASS_WARN_AGE` in `/etc/login.defs` apply at account creation and do not automatically update existing accounts.
- The monitoring examples parse English `chage -l` output. For highly localized systems, using `chage -i -l` would make date parsing more predictable, but the existing examples are valid in the default English output context.
