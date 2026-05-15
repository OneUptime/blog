# Validation Summary: How to Configure the /etc/login.defs File for Default User Settings on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- `/etc/login.defs`
- `shadow-utils` tools: `useradd`, `newusers`, `userdel`, `chage`
- PAM, `pam_umask`, and `pam_pwquality`
- Linux UID/GID ranges, password aging, umask, and password hashing policy

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing users and groups": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-and-groups_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat certification policy guide, password configuration test for RHEL 8/9 SHA-512 and RHEL 10 YESCRYPT: https://docs.redhat.com/en/documentation/red_hat_certified_cloud_and_service_provider_certification/2025/html/red_hat_certified_cloud_and_service_provider_certification_policy_guide/assembly-security-practices-overview_cloud-image-pol-image-config-overview
- Local `login.defs(5)` man page from shadow-utils 4.13
- Local `useradd(8)` man page from shadow-utils 4.13
- Local `chage(1)` man page from shadow-utils 4.13
- Local `pam_umask(8)` man page from Linux-PAM
- Linux man-pages for `login.defs(5)`: https://man7.org/linux/man-pages/man5/login.defs.5.html
- Linux man-pages for `useradd(8)`: https://man7.org/linux/man-pages/man8/useradd.8.html
- Linux man-pages for `pam_umask(8)`: https://man7.org/linux/man-pages/man8/pam_umask.8.html

## Issues Found
- The UID/GID inspection command only matched `UID_*` and `GID_*`, but the post then showed `SYS_UID_*` and `SYS_GID_*`. Changed the grep pattern to include system UID/GID ranges.
- The post treated `PASS_MIN_LEN` as a normal RHEL 9 password-length setting. Removed it from the examples and added a note that RHEL 9 password length and complexity enforcement is handled through PAM, normally `pam_pwquality` and `/etc/security/pwquality.conf`.
- The UMASK explanation was too broad. Clarified that `UMASK` is used by `useradd`/`newusers` for home directory mode when `HOME_MODE` is not set, and by `pam_umask` as a default login umask.
- The `ENCRYPT_METHOD` section incorrectly implied that `/etc/login.defs` directly determines normal user password hashes in `/etc/shadow` on RHEL 9 and recommended YESCRYPT. Rewrote the section to explain the PAM/authselect distinction, kept SHA-512 for RHEL 9, and removed the YESCRYPT recommendation.
- The command for active settings used two `grep` calls that could leave indented comments. Replaced it with an `awk` command that skips blank lines and comment records based on the first field.
- The wrap-up said changes only affect new accounts. Narrowed that statement to account-creation defaults because some `login.defs` settings are consumed by login/PAM behavior.

## Review Notes
The remaining examples are syntactically valid shell/configuration snippets. The post is now accurate for RHEL 9, but password hashing and password quality policy remain version- and authselect-profile-dependent areas; future updates should re-check those sections if the post is retargeted to RHEL 10 or later.
