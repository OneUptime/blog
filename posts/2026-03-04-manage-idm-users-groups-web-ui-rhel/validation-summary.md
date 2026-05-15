# Validation Summary: How to Manage IdM Users and Groups from the Web UI on RHEL

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux Identity Management (IdM)
- FreeIPA Web UI
- Kerberos SSO
- IdM users and user groups
- Host-Based Access Control (HBAC)
- `ipa` CLI
- IdM JSON-RPC API

## Sources Consulted
- Red Hat Enterprise Linux 8: Configuring and managing Identity Management - Accessing the IdM Web UI and Kerberos login: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/configuring_and_managing_identity_management/Red_Hat_Enterprise_Linux-8-Configuring_and_managing_Identity_Management-en-US.pdf
- Red Hat Enterprise Linux 8: Managing IdM users, groups, hosts, and access control rules - Managing users in the Web UI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/managing_idm_users_groups_hosts_and_access_control_rules/Red_Hat_Enterprise_Linux-8-Managing_IdM_users_groups_hosts_and_access_control_rules-en-US.pdf
- Red Hat Enterprise Linux 8: Managing IdM users, groups, hosts, and access control rules - Managing user groups in the Web UI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/managing_idm_users_groups_hosts_and_access_control_rules/Red_Hat_Enterprise_Linux-8-Managing_IdM_users_groups_hosts_and_access_control_rules-en-US.pdf
- Red Hat Enterprise Linux 8: Managing IdM users, groups, hosts, and access control rules - Configuring HBAC rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/managing_idm_users_groups_hosts_and_access_control_rules/Red_Hat_Enterprise_Linux-8-Managing_IdM_users_groups_hosts_and_access_control_rules-en-US.pdf
- FreeIPA Web UI documentation: https://www.freeipa.org/page/Web_UI
- FreeIPA Client Configuration Guide - browser Kerberos settings: https://www.freeipa.org/page/Client_Configuration_Guide.html

## Issues Found
- The user creation workflow listed optional Class and email fields in the initial Add dialog. Red Hat documents User login, First name, Last name, and optional GID/password fields for this flow, so the step was changed to mention GID or password instead.
- The group membership workflow referred to a generic Members tab. Red Hat documents selecting the member type, such as Users, User Groups, or External, then moving selections to the prospective column before confirming. The steps were updated accordingly.
- The CLI comparison claimed that any Web UI action can also be done via CLI. FreeIPA documents the Web UI as having almost the same capabilities as the `ipa` CLI, so the wording was narrowed to "most common Web UI actions".
- The API statement was clarified to say that the Web UI uses the JSON-RPC interface to access the IdM API, matching FreeIPA documentation.

## Review Notes
The Web UI URL, Kerberos SSO flow with `kinit`, Firefox `network.negotiate-auth.trusted-uris` setting, `ipa user-add jdoe --first=Jane --last=Doe` command, and HBAC navigation path were consistent with the consulted Red Hat and FreeIPA documentation. Future improvements could add more detail about browser-specific Kerberos setup, but the current post remains technically correct after the edits.
