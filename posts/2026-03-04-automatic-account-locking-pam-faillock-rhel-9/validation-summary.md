# Validation Summary: How to Configure Automatic Account Locking with pam_faillock on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux-PAM
- pam_faillock
- faillock.conf
- authselect
- SSH login testing
- syslog and /var/log/secure

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 7 Security Guide, "Account Locking": https://docs.redhat.com/en/documentation/Red_Hat_Enterprise_Linux/7/html-single/security_guide/index
- Local Linux-PAM `pam_faillock(8)` manual page
- Local Linux-PAM `faillock(8)` manual page
- Local Linux-PAM `faillock.conf(5)` manual page
- authselect manual reference for `enable-feature`: https://www.mankier.com/8/authselect
- Linux-PAM `faillock.conf(5)` manual reference: https://www.man7.org/linux/man-pages/man5/faillock.conf.5.html

## Issues Found
- The `audit` option was described as logging failed attempts to syslog. Linux-PAM documents this option as logging the user name when the user is not found, so the comment was corrected.
- The `dir = /var/run/faillock` example did not mention that the default `/var/run` location is usually cleared on reboot. Added that caveat to match `faillock.conf(5)`.
- The specific-user exclusion guidance incorrectly referred to `pam_access` and an `even_deny_root` exception. Replaced it with Red Hat's documented `pam_succeed_if.so user in ...` pattern and noted that RHEL 9 authselect-managed systems should make this change in a custom authselect profile rather than directly editing generated PAM files.

## Review Notes
- The core `faillock`, `faillock --user`, `--reset`, `deny`, `unlock_time`, `fail_interval`, `local_users_only`, `even_deny_root`, and `root_unlock_time` usage matches Linux-PAM documentation.
- The compliance examples are plausible policy examples, but organizations should verify the exact values against the currently applicable PCI DSS, CIS, or DISA STIG profile before applying them.
