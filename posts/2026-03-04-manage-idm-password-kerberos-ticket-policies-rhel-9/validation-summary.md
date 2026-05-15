# Validation Summary: How to Manage IdM Password Policies and Kerberos Ticket Policies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA CLI
- IdM password policies
- Kerberos ticket policies
- Kerberos KDC logging

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Defining IdM password policies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/defining-idm-password-policies_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation: Managing Kerberos ticket policies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-kerberos-ticket-policies_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation: Managing user passwords in IdM - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-passwords-in-idm_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation: IdM log files and directories - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/accessing_identity_management_services/
- FreeIPA API reference: pwpolicy_add and pwpolicy_show - https://freeipa.readthedocs.io/en/ipa-4-11/api/pwpolicy_add.html and https://freeipa.readthedocs.io/en/ipa-4-11/api/pwpolicy_show.html
- FreeIPA group password policy documentation - https://www.freeipa.org/page/V2/Group_Password_Policy

## Issues Found
- The post described `--minlife=1` as one day. Red Hat documents minimum password lifetime in hours, so the comment now says one hour.
- The global password policy examples passed `global_policy` to `ipa pwpolicy-show` and `ipa pwpolicy-mod`. Red Hat documents showing and modifying the global policy without a policy name, so the examples now use `ipa pwpolicy-show` and `ipa pwpolicy-mod --option=value`.
- The group policy priority comment implied the global policy has priority 0. Red Hat documents that the global policy has no priority and only acts as a fallback, so the comment was corrected.
- The raw Kerberos password expiration check used `--all` without `--raw`. The command now includes `--raw` when grepping for `krbPasswordExpiration`.
- The expiration date format comment said `YYYYMMDD`, but the attribute values use Kerberos/LDAP GeneralizedTime-style timestamps. The comment now states `YYYYMMDDHHMMSSZ`.
- The monitoring command claimed to find users expiring in the next seven days but only grepped all expiration attributes. The comment was changed to match the actual command, and `--sizelimit=0` was added.
- The lockout check used `ipa user-find --locked=True`, which is not the Red Hat-documented method for password-policy lockout checks. It was replaced with `ipa user-status` plus `ipa pwpolicy-show --user`.
- The Kerberos ticket troubleshooting example used `ipa krbtpolicy-show --user=jsmith`, but Red Hat documents the user as a positional argument. It now uses `ipa krbtpolicy-show jsmith`.
- The KDC troubleshooting example used `journalctl -u krb5kdc`; Red Hat documents `/var/log/krb5kdc.log` as the primary KDC log file, so the example now greps that file.

## Review Notes
The examples assume the referenced IdM groups and users already exist and that commands are run by an IdM administrator with a valid Kerberos ticket. The service account policy values are recommendations only; environments with non-interactive service principals should validate password expiration and lockout behavior against their operational model.
