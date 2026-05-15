# Validation Summary: How to Configure faillock.conf for Account Lockout Policies on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux-PAM
- pam_faillock
- faillock.conf
- authselect
- DISA STIG account lockout guidance

## Sources Consulted
- Linux-PAM `faillock.conf(5)` manual page: https://www.man7.org/linux/man-pages/man5/faillock.conf.5.html
- Linux-PAM `pam_faillock(8)` manual page: https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- Linux-PAM `faillock(8)` manual page: https://www.linux.org/docs/man8/faillock.html
- Red Hat Enterprise Linux 9 authentication and authorization documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Customer Portal article landing page for pam_faillock on RHEL 8, 9, and 10: https://access.redhat.com/solutions/62949
- DISA STIG Viewer RHEL 9 root lockout requirement V-258055: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2025-05-14/finding/V-258055
- DISA STIG Viewer RHEL 9 account unlock requirement V-258057: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-258057
- DISA STIG Viewer RHEL 9 persistent faillock directory requirement V-258060: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2025-05-14/finding/V-258060

## Issues Found
- The post claimed it covered all available faillock.conf options, but it did not include every option from the man page. Changed the wording to "commonly used options" and "common options" to avoid overclaiming.
- The post described `audit` as auditing failed attempts or sending lockout events to syslog. The man page defines `audit` as logging the user name when the user is not found. Updated the comments and explanation.
- The post said `root_unlock_time` was only used with `even_deny_root`. The man page states that `root_unlock_time` implies `even_deny_root`. Updated the comment and troubleshooting example.
- The post described `admin_group` as an absolute lockout exemption. The man page says members of that group are handled like root, so `even_deny_root` and `root_unlock_time` apply to them. Updated the explanation.
- The DISA STIG example included `root_unlock_time = 60` even though STIG guidance requires root and regular account lockout until administrator release when `unlock_time = 0` is used. Removed `root_unlock_time = 60` from that example and added `dir = /var/log/faillock` to reflect the STIG persistent lockout requirement.
- The troubleshooting section said `deny = 0` causes lockout on the first failure. The correct first-failure threshold is `deny = 1`; `deny = 0` is not documented as the first-failure lockout setting. Updated the text.
- The post called faillock.conf the single source of truth. The pam_faillock man page says module command-line options override the configuration file. Updated the wording to "preferred source" and noted the override behavior.

## Review Notes
The local environment did not have `authselect` installed, so the authselect command could not be checked with local `--help`. The RHEL and STIG documentation both reference `authselect enable-feature with-faillock`, and the local Linux-PAM man pages confirmed the faillock configuration options and `faillock --user ... --reset` usage.
