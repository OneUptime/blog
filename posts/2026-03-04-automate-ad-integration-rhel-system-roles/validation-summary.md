# Validation Summary: How to Automate Active Directory Integration Using RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- Active Directory integration
- SSSD
- realmd
- authselect
- timesync / chrony
- Ansible Vault

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Joining RHEL systems to an Active Directory by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/automating_system_administration_by_using_rhel_system_roles/integrating-rhel-systems-into-ad-directly-with-ansible-using-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation, "Managing time synchronization using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Red Hat RHEL System Roles catalog entry for `redhat.rhel_system_roles`: https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles
- realmd `realm(8)` command manual: https://www.freedesktop.org/software/realmd/docs/realm-manual.html
- realmd guide, "Logins using Domain Accounts": https://www.freedesktop.org/software/realmd/docs/guide-active-directory-permit.html
- SSSD documentation, "Joining AD Domain Manually": https://sssd.io/docs/ad/ad-provider-manual.html
- Ansible documentation for `ansible.builtin.systemd_service`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Red Hat Enterprise Linux documentation, "Configuring user authentication using authselect": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect

## Issues Found
- The description referred to an `sssd` RHEL System Role. RHEL System Roles provide `ad_integration`, which configures SSSD, but there is not a separate `sssd` role in the current documented workflow. I changed the description to refer to the `ad_integration` role, SSSD settings, and timesync.
- The installation verification and role examples used legacy role paths/names. Current Red Hat documentation uses the `redhat.rhel_system_roles` collection naming, so I updated verification and role references to `redhat.rhel_system_roles.ad_integration` and `redhat.rhel_system_roles.timesync`.
- The AD join example used `ad_integration_timesync: true`, which is not the documented role variable. Red Hat documents `ad_integration_timesync_source`, which also enables the role's time synchronization handling, so I replaced the boolean with `ad_integration_timesync_source: dc1.example.com`.
- The SSSD section overwrote `/etc/sssd/sssd.conf` with a template while claiming to configure SSSD with System Roles. The `ad_integration` role supports SSSD customization through `ad_integration_sssd_custom_settings`, so I replaced the template task with role variables and kept the displayed SSSD domain settings as the resulting configuration.
- The verification playbook used `ansible.builtin.systemd` with only `name: sssd`. Current Ansible documentation requires an action such as `state` or `enabled`, so I changed the status check to `systemctl is-active sssd` with `changed_when: false`.
- The sudoers snippets omitted a trailing newline in the copied content. I updated the snippets to write a newline and kept `visudo -cf %s` validation.

## Review Notes
- I could not run `ansible-playbook --syntax-check` locally because Ansible is not installed in this workspace. The snippets were reviewed against the official documentation listed above.
- `realm permit -g` is valid for permitting AD groups, but group names and sudoers entries still need to match the site's chosen SSSD name format and case-handling behavior.
