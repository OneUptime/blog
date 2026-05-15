# Validation Summary: How to Configure Host-Based Access Control (HBAC) Rules in IdM on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA / IPA CLI
- Host-Based Access Control (HBAC)
- SSSD
- PAM services
- sudo rules

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring host-based access control rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_idm_users_groups_hosts_and_access_control_rules/configuring-host-based-access-control-rules_managing-users-groups-hosts
- Red Hat Enterprise Linux 9 documentation: Using Ansible to configure HBAC and sudo rules in IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_ansible_to_install_and_manage_identity_management/using-ansible-to-configure-hbac-and-sudo-rules-in-idm_using-ansible-to-install-and-manage-identity-management
- Red Hat Enterprise Linux 9 documentation: Using IdM API, managing HBAC and sudo rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_idm_api/index
- FreeIPA API reference: hbacrule_add_service: https://freeipa.readthedocs.io/en/ipa-4-9/api/hbacrule_add_service.html
- FreeIPA API reference: hbacsvcgroup_add_member: https://freeipa.readthedocs.io/en/ipa-4-9/api/hbacsvcgroup_add_member.html
- FreeIPA API reference: hbactest: https://freeipa.readthedocs.io/en/ipa-4-9/api/hbactest.html

## Issues Found
- The pre-disable `ipa hbactest` examples did not specify `--rules`. Because the default `allow_all` rule is still enabled at that point, testing without `--rules` applies all enabled rules and would grant access through `allow_all`, making the expected denied test incorrect. Updated the Step 4 test commands to explicitly test only the custom rules before disabling `allow_all`.
- The post described `ssh` as an HBAC service example, while the commands correctly use the default HBAC service name `sshd`. Changed the example wording to `sshd`.
- The post described `sudo` as "Sudo privilege". HBAC can control access to the sudo PAM service, but sudo command authorization is managed through IdM sudo rules. Updated the wording to clarify that sudo rules grant command privileges.
- The custom service example did not state that HBAC custom services correspond to PAM services on the client. Updated the introduction to the command to clarify this.

## Review Notes
- The main workflow is accurate for RHEL 9 IdM: create custom HBAC rules, test them, then disable the default `allow_all` rule.
- The `ipa hbacrule-*`, `ipa hbacsvc-*`, `ipa hbacsvcgroup-*`, and `ipa hbactest` command usage is consistent with Red Hat and FreeIPA documentation.
- For trusted Active Directory users, Red Hat notes that HBAC simulation cannot resolve AD group membership in `ipa hbactest`; that caveat is outside the scope of this introductory post.
