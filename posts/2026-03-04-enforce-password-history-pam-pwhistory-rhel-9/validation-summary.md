# Validation Summary: How to Enforce Password History with pam_pwhistory on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux PAM
- pam_pwhistory
- pam_pwquality
- pam_unix
- authselect

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring user authentication using authselect": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Red Hat Enterprise Linux 9 documentation, "Creating and deploying your own authselect profile": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel
- Linux-PAM pam_pwhistory(8) manual page: https://www.man7.org/linux/man-pages/man8/pam_pwhistory.8.html
- Linux-PAM pwhistory.conf(5) manual page, checked locally with `man pwhistory.conf`
- Linux-PAM pam_unix(8) manual page, checked locally with `man pam_unix`
- OpenSCAP Security Guide for RHEL 9 CIS Server Level 1 profile: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis_server_l1.html
- OpenSCAP Security Guide for RHEL 9 STIG profile: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-stig.html

## Issues Found
- The authselect guidance implied editing PAM configuration directly or adding to an existing profile. Updated it to prefer `authselect enable-feature with-pwhistory` when available and to use a custom profile rather than editing generated `/etc/pam.d` files directly.
- The custom authselect example edited only `system-auth`. Updated it to check and edit both `system-auth` and `password-auth`, matching RHEL 9 authselect/OpenSCAP guidance.
- The custom profile creation command used `--base-on`; Red Hat documentation shows the short `-b sssd` form. Updated the command.
- The compliance table listed CIS as `remember=24`. For RHEL 9 OpenSCAP CIS profiles, the password history value is `remember=5` or greater. Updated the table and example.
- The post claimed "Password has been already used" for a new password can be caused by a hash algorithm mismatch between `pam_pwhistory` and `pam_unix`. Linux-PAM documentation describes `pam_pwhistory` as checking against stored history hashes, while `pam_unix` handles password storage and hashing. Replaced that troubleshooting advice with inspection of the configured history file.
- The `enforce_for_root` section stated most compliance frameworks require it. Softened this to enabling it when the baseline requires root password changes to follow the same history rule.

## Review Notes
The post is technically relevant and the remaining commands and PAM options align with Linux-PAM and Red Hat guidance. The `with-pwhistory` authselect feature may not be present on every RHEL 9 minor release or installed authselect version, so the custom-profile fallback remains useful.
