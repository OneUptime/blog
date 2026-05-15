# Validation Summary: How to Configure authselect Profiles for PAM and NSS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- authselect
- PAM
- NSS
- SSSD
- Samba Winbind
- pam_faillock
- pam_access

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring user authentication using authselect": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- authselect(8) manual page: https://www.mankier.com/8/authselect
- faillock.conf(5) Linux-PAM manual page: https://www.man7.org/linux/man-pages/man5/faillock.conf.5.html
- pam_access(8) Linux-PAM manual page: https://man7.org/linux/man-pages/man8/pam_access.8.html
- access.conf(5) Linux-PAM manual page: https://man.archlinux.org/man/core/pam/access.conf.5.en

## Issues Found
- The `authselect check` example was described as showing which files authselect manages. I changed the comment to say it validates whether the current configuration is managed by authselect, matching the `authselect(8)` behavior.
- The explanation after `authselect check` only mentioned manually edited PAM files. I updated it to include PAM or NSS files because authselect also validates generated NSS configuration.
- The `faillock.conf` example used `even_deny_root = false`, but `even_deny_root` is a flag-style option. I changed it to commented optional lines: `# even_deny_root` and `# root_unlock_time = 60`.
- The migration section said authselect can detect and migrate old authconfig configuration. Red Hat documents conversion from authconfig commands to authselect profiles/features, not an automatic migration performed by `authselect check`. I changed the comment to describe `authselect check` as a management/validity check.
- The troubleshooting section said `authselect apply-changes` overwrites manual changes. The manual says it reapplies a valid selected profile and returns an error for invalid/manual changes. I clarified that `apply-changes` is for authselect template or `user-nsswitch.conf` changes, while `--force` is the overwrite path for externally modified files.

## Review Notes
The post is technically relevant and the main authselect profile, feature, custom profile, NSS, PAM access, and faillock guidance is accurate for RHEL 9 after the corrections above. Future improvements could mention Red Hat's warning that `ipa-client-install` and `realm join` configure authselect automatically and that administrators should avoid changing those generated profiles unless they preserve the current settings.
