# Validation Summary: How to Apply RHEL System Roles Across Multiple RHEL Versions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 7, 8, and 9
- RHEL System Roles
- Ansible playbooks and inventory
- Ansible Galaxy collections
- chrony, ntpd, NetworkManager, firewalld, rsyslog/logging

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Introduction to RHEL system roles, including supported managed node versions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/intro-to-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 7.9 documentation: Installing and using the `redhat.rhel_system_roles` collection and FQCN role names: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/automating_system_administration_by_using_rhel_system_roles_in_rhel_7.9/installing-and-using-collections_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 8 documentation: `timesync` role behavior and provider selection: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/automating_system_administration_by_using_rhel_system_roles/configuring-time-synchronization-by-using-the-timesync-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 7.9 documentation: RHEL System Roles package installation and available roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/automating_system_administration_by_using_rhel_system_roles_in_rhel_7.9/assembly_preparing-a-control-node-and-managed-nodes-to-use-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 8 documentation: `network_connections` static IP examples for the network role: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Red Hat Enterprise Linux 8 documentation: logging role inputs, outputs, and flows: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/automating_system_administration_by_using_rhel_system_roles/configuring-logging-by-using-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 7.9 documentation: `ha_cluster` RHEL System Role support: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/automating_system_administration_by_using_rhel_system_roles_in_rhel_7.9/configuring-a-high-availability-cluster-by-using-the-ha-cluster-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Ansible documentation: target node Python support and Python 2.7 support through ansible-core 2.16: https://docs.ansible.com/ansible/latest/reference_appendices/release_and_maintenance.html

## Issues Found
- The post used bare "RHEL" in several places where it meant "RHEL 9". Updated the prose, Mermaid diagram, result bullets, and support table header to say "RHEL 9".
- The post stated that the `timesync` role uses ntpd on RHEL 7. Red Hat documents that RHEL 7 uses chronyd by default, or ntpd if it is already installed or selected with `timesync_ntp_provider`. Updated the explanation, diagram, playbook outcome, and support table.
- The installation section used `dnf` generically for all RHEL control nodes. Updated it to use `dnf` for RHEL 8/9 and `yum` for RHEL 7.
- The Ansible Galaxy installation note did not explain that collection installs use FQCN role names such as `redhat.rhel_system_roles.timesync`. Added that distinction because the examples use package-style role names.
- The support table listed `ha_cluster` as unsupported on RHEL 7. Red Hat documents the `ha_cluster` role in the RHEL 7.9 System Roles guide, so the table now marks it as supported.

## Review Notes
The remaining examples are syntactically valid YAML or INI snippets and align with documented RHEL System Roles variable names. The version-specific `set_fact` example is illustrative rather than a complete firewall configuration; a future revision could make it more concrete by showing version-specific variables that are consumed by a role or task.
