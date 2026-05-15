# Validation Summary: How to Install and Get Started with RHEL System Roles on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL System Roles
- Ansible
- DNF
- NTP time synchronization

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Preparing a control node and managed nodes to use RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/assembly_preparing-a-control-node-and-managed-nodes-to-use-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Introduction to RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/intro-to-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Configuring time synchronization by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-time-synchronization-by-using-the-timesync-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings, managing time synchronization using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings

## Issues Found
- The post said the `rhel-system-roles` package installs roles to `/usr/share/ansible/roles/`. Current RHEL 9 documentation states that the package installs the `redhat.rhel_system_roles` collection under `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`, so the path was updated.
- The playbook used the older role name `rhel-system-roles.timesync`. Current RHEL 9 RHEL System Roles documentation uses `ansible.builtin.include_role` with `redhat.rhel_system_roles.timesync`, so the example was updated to that supported collection form.
- The role-listing command used `/usr/share/ansible/roles/`. It was changed to list the collection role directory.
- The examples of available roles omitted several current RHEL 9 roles that are useful in this context. The list was updated to include `ssh`, `systemd`, and `tlog`.

## Review Notes
The tutorial remains intentionally minimal. Future improvements could add an `ansible-playbook --syntax-check` step and a concrete `chronyc sources` verification command for the timesync example.
