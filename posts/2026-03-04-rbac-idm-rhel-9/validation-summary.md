# Validation Summary: How to Configure Role-Based Access Control (RBAC) in IdM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA / `ipa` CLI
- Role-Based Access Control (RBAC)
- IdM delegation rules
- IdM self-service rules

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing role-based access controls in IdM using the CLI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-role-based-access-controls-in-idm-using-the-cli_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation, "Managing role-based access controls using the IdM Web UI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-role-based-access-controls-using-the-idm-web-ui_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation, "Delegating permissions to user groups to manage users using IdM CLI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/delegating-permissions-to-user-groups-to-manage-users-using-idm-cli_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation, "Managing self-service rules in IdM using the CLI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-self-service-rules-in-idm-using-the-cli_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation, "Managing user passwords in IdM": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-passwords-in-idm_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation, "Managing user groups in IdM CLI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-groups-in-idm-cli_managing-users-groups-hosts
- FreeIPA 4.11 API reference, `role_find`: https://freeipa.readthedocs.io/en/ipa-4-11/api/role_find.html

## Issues Found
- The built-in roles table listed several privileges, such as `Group Administrator`, `Host Administrator`, and `DNS Administrators`, as roles. Replaced the table with predefined roles documented for RHEL 9 IdM.
- The custom `Helpdesk` role conflicted with the predefined `helpdesk` role and used hand-written password reset permissions that are easy to get wrong. Changed the example to create `Password Helpdesk` and assign the built-in `Modify Users and Reset passwords` privilege.
- The post claimed delegation could add and remove group members by delegating the `member` attribute. RHEL IdM delegation rules manage selected user attributes in another user group; group membership management should use member managers. Updated the delegation example and added `ipa group-add-member-manager`.
- The self-service examples omitted `--permissions=write`, which Red Hat documents as one of the required options for `ipa selfservice-add`. Added it.
- The role audit shell loop split role names containing spaces. Replaced it with a `while read` pipeline that preserves full role names.
- `ipa role-find --users=jsmith` is not a valid `role-find` filter in the current FreeIPA API. Replaced it with `ipa user-show jsmith --all` and a role membership grep.
- The auditor role examples used `--attrs="*"`, which is not the documented way to grant access to all attributes. Removed the wildcard attribute and used `read` plus `search` rights with object types.

## Review Notes
The post is now technically valid for RHEL 9 IdM CLI usage. The examples still assume the named users and groups already exist where required, and they should be tested in a non-production IdM environment before rollout.
