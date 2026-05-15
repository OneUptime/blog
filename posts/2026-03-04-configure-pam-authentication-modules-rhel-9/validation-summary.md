# Validation Summary: How to Configure PAM Authentication Modules on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux-PAM
- authselect
- pam_unix
- pam_faillock
- pam_pwquality
- pam_pwhistory
- pam_access
- pam_limits
- pamtester

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring authentication and authorization in RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Red Hat Enterprise Linux 9 documentation: About PAM configuration files - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel
- Linux-PAM local man page: pam.conf(5) / pam.d(5)
- Linux-PAM local man page: pam_unix(8)
- Linux-PAM local man page: pam_faillock(8)
- Linux-PAM local man page: faillock.conf(5)
- Linux-PAM local man page: pam_pwquality(8)
- Linux-PAM local man page: pam_pwhistory(8)
- Linux-PAM local man page: pam_access(8)
- Linux-PAM local man page: access.conf(5)
- Linux-PAM local man page: pam_limits(8)
- authselect(8) manual reference - https://www.mankier.com/8/authselect
- authselect-profiles(5) manual reference - https://www.mankier.com/5/authselect-profiles
- Red Hat Enterprise Linux 9.5 release notes for pam_console deprecation - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/9.5_release_notes/index

## Issues Found
- The sample `/etc/pam.d/sshd` stack included `pam_console.so`. `pam_console` is deprecated in RHEL 9.5 and not appropriate for a current RHEL 9 example, so the line was removed.
- The `pam_faillock.so` example used only `preauth` and `authfail` lines with lockout settings inline, which was incomplete for the described behavior and did not reflect the preferred `faillock.conf` configuration path. The snippet now includes the authentication result path and an account phase line, and the text explains that `deny=5` and `unlock_time=900` should be set in `/etc/security/faillock.conf`.
- The `access.conf` examples used `@admins` and `@developers`, which is netgroup syntax. For Unix groups, `access.conf(5)` documents parenthesized group names, so these were changed to `(admins)` and `(developers)`.
- The `pam_access` enablement section said to add a line but only showed a `grep` command. It now checks the existing configuration and shows `authselect enable-feature with-pamaccess`.
- The troubleshooting section described `ldd /usr/lib64/security/pam_unix.so` as listing loaded PAM modules for a service. `ldd` shows shared library dependencies for that module, so the comment was corrected.

## Review Notes
- Red Hat recommends using authselect rather than manually editing generated PAM files. The post already communicates this, and the corrected examples keep that guidance intact.
- The `pam_pwquality`, `pam_pwhistory`, `pam_unix`, `pam_access`, `pam_limits`, `pamtester`, and `authselect create-profile` examples were consistent with the consulted documentation.
