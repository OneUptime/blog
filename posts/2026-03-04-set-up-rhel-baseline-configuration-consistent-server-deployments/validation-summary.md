# Validation Summary: How to Set Up a RHEL Baseline Configuration for Consistent Server Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart automated installation
- Ansible and RHEL System Roles
- firewalld
- SELinux
- chrony time synchronization
- DNF Automatic
- Linux sysctl configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Automating system administration by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/
- Red Hat Enterprise Linux 9 documentation: Configuring firewalld by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/assembly_configuring-firewalld-using-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Configuring time synchronization by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/
- Red Hat Enterprise Linux 9 documentation: Automating software updates in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool
- firewalld documentation: firewall-offline-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-offline-cmd.html

## Issues Found
- The RHEL System Roles example used the legacy role names `rhel-system-roles.timesync`, `rhel-system-roles.firewall`, and `rhel-system-roles.selinux`. Red Hat's current RHEL 9 examples use the collection-qualified role names under `redhat.rhel_system_roles`. Updated the playbook to use `redhat.rhel_system_roles.timesync`, `redhat.rhel_system_roles.firewall`, and `redhat.rhel_system_roles.selinux`.
- The role-listing command pointed at `/usr/share/ansible/roles/`, while Red Hat documents that installing `rhel-system-roles` on RHEL 9 installs the collection under `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`. Updated the command to list the roles directory inside that collection.

## Review Notes
The Kickstart directives, DNF Automatic timer name, SELinux enforcing setting, firewalld offline commands, and baseline verification commands are technically sound for RHEL 9. The example root password hash remains a placeholder and should be replaced with a real hashed secret or generated through an approved secret-management workflow before production use.
