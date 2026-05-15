# Validation Summary: How to Use authselect to Manage PAM Profiles on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- authselect
- PAM
- NSS / nsswitch.conf
- SSSD
- realmd
- authconfig compatibility

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring user authentication using authselect": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- authselect(8) manual page: https://www.mankier.com/8/authselect
- authselect-profiles(5) manual page: https://www.mankier.com/5/authselect-profiles
- Red Hat Customer Portal, "How to join RHEL to Active Directory using realmd": https://access.redhat.com/solutions/1350723

## Issues Found
- The post used `authselect backup my-backup-$(date +%Y%m%d)`, but `authselect` does not provide a standalone `backup` subcommand. Backups are created through options such as `--backup=NAME` or `-b` on commands including `select`, `apply-changes`, `enable-feature`, and `disable-feature`. Changed the example to `sudo authselect apply-changes --backup=my-backup-$(date +%Y%m%d)`.
- The post said to use `authselect apply-changes` to fix manually modified managed PAM files. The `authselect(8)` manual says `apply-changes` only re-applies changes when the existing authselect configuration is valid; for unexpected/manual changes, the documented recovery path is selecting the intended profile with `--force`. Updated both recovery examples to re-select the intended profile and features with `--force`.
- The AD workstation example implied that `authselect select sssd ... --force` should always be run after `realm join`. Red Hat documentation states that `realm join` automatically configures SSSD authentication and recommends against changing authselect profiles configured by `realm join` without first checking current settings. Updated the example to check `authselect current` first and only add features if needed.

## Review Notes
The post is technically relevant and the remaining examples align with the RHEL 9 authselect documentation and authselect manual pages. Future improvements could mention `authselect requirements <profile> <features>` before enabling optional features, but that is an enhancement rather than a correctness issue.
