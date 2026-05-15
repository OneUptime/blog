# Validation Summary: How to Manage IdM Users and Groups from the Command Line on RHEL 9

## Status
validated

## Post Type
Tutorial / command-line administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA `ipa` CLI
- Kerberos authentication
- IdM users, groups, password policies, and certificates
- Bash scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing user accounts using the command line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-accounts-using-the-command-line_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation: Managing user passwords in IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-passwords-in-idm_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation: Defining IdM password policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/defining-idm-password-policies_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation: Managing certificates in IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_certificates_in_idm/index
- FreeIPA API reference for `user_add`, `user_del`, `user_find`, `group_add`, `group_add_member`, `cert_request`, and `cert_find`: https://freeipa.readthedocs.io/en/latest/api/index.html
- FreeIPA user certificate design notes and command examples: https://www.freeipa.org/page/V4/User_Certificates

## Issues Found
- The post showed `ipa user-del jsmith --permanent`. FreeIPA `user_del` supports `--preserve` and `--continue`, but not `--permanent`; permanent deletion is the default behavior for `ipa user-del` when `--preserve` is not used. Updated the example to show default permanent deletion and a valid `--continue` multi-user deletion example.
- The user certificate request example used `ipa cert-request user-cert.csr --principal=jsmith` without a certificate profile. RHEL documentation notes that `ipa cert-request` defaults to the service certificate profile, while user certificates require a suitable user certificate profile. Updated the example to include `--profile-id=smime`.

## Review Notes
The remaining user, group, password reset, password policy, preserved-user, JSON output, and bulk scripting examples are consistent with Red Hat IdM and FreeIPA CLI behavior. The certificate example assumes the referenced user certificate profile exists and is permitted by CA ACLs, which is normal for IdM certificate-profile workflows.
