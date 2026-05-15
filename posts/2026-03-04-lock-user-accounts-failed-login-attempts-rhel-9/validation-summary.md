# Validation Summary: How to Lock User Accounts After Failed Login Attempts on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux PAM
- pam_faillock
- faillock
- authselect
- faillock.conf
- Bash scripting
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Linux-PAM `pam_faillock(8)` manual page: https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- Linux-PAM `faillock(8)` manual page: https://man7.org/linux/man-pages/man8/faillock.8.html
- Linux-PAM `faillock.conf(5)` manual page: https://man7.org/linux/man-pages/man5/faillock.conf.5.html
- Local system manual pages for `pam_faillock(8)`, `faillock(8)`, and `faillock.conf(5)`

## Issues Found
- The post described the `audit` option as "Log failures to syslog." The Linux-PAM `faillock.conf(5)` manual defines `audit` more specifically as logging the user name when the user is not found. Updated the comment to "Log unknown user names to syslog."
- The post said `pam_faillock` appears twice in the PAM stack. The Linux-PAM `pam_faillock(8)` documentation describes `preauth`, `authfail`, and `authsucc`, and `authsucc` is important for clearing records after successful authentication so failures are treated as consecutive. Updated the explanation and troubleshooting note to include `authsucc`.
- The monitoring script hard-coded `/var/run/faillock`, even though the post shows how to change the tally directory with `dir`. Added a `FAILLOCK_DIR` variable so the script can match the configured tally directory.

## Review Notes
The core setup, `authselect enable-feature with-faillock`, `faillock` command usage, `faillock.conf` option names, default tally directory behavior, root lockout options, and manual reset commands are consistent with RHEL 9 documentation and Linux-PAM manual pages. For environments with centralized identity providers, administrators should also consider whether `local_users_only` is appropriate to avoid double lockout behavior.
