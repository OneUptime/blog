# Validation Summary: How to Lock and Unlock User Accounts on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux local user management
- shadow-utils commands: `passwd`, `usermod`, `chage`
- `/etc/shadow` and `/etc/passwd`
- PAM-authenticated login behavior
- `/sbin/nologin`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings, managing users and groups: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-and-groups_configuring-basic-system-settings
- Red Hat article, "Linux sysadmin basics: User account management": https://www.redhat.com/en/blog/linux-user-account-management
- Local `passwd(1)` man page from shadow-utils 4.13
- Local `usermod(8)` man page from shadow-utils 4.13
- Local `chage(1)` man page from shadow-utils 4.13
- Local `shadow(5)` man page from shadow-utils 4.13
- Local `nologin(8)` and `nologin(5)` man pages
- util-linux `nologin(8)` reference: https://www.mankier.com/8/nologin
- RHEL 9 STIG guidance for system accounts and interactive shells: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2025-02-27/finding/V-258046

## Issues Found
- The post used `chage -E 0` and described it as setting the account expiration to January 1, 1970. The `shadow(5)` man page says account-expiration value `0` should not be used because it can be interpreted as either no expiration or January 1, 1970. Changed the examples and recommendations to `chage -E 1`, which sets a date safely in the past, and updated the explanation accordingly.
- The `/etc/shadow` verification example used `grep jsmith /etc/shadow`, which can match unintended usernames containing that string. Changed it to `grep '^jsmith:' /etc/shadow` for an exact account entry match.
- The all-in-one check used `USER` as a shell variable and expanded it unquoted. Changed it to `ACCOUNT` and quoted the expansions to avoid clobbering the conventional `USER` environment variable and to keep the shell example robust.
- The service-account section said service accounts should always use `/sbin/nologin` and that only `root` should have a real shell. This was too absolute for RHEL systems, where some special-purpose system accounts may use command shells such as `/bin/sync`, `/sbin/shutdown`, or `/sbin/halt`, and package documentation can justify exceptions. Updated the wording and the audit command to focus on interactive shells.

## Review Notes
The core distinctions between password locking, account expiration, shell changes, and active sessions are accurate for local RHEL-style accounts. Environments using LDAP, IdM, SSSD, or application-specific account databases may require additional checks outside `/etc/shadow` and `/etc/passwd`.
