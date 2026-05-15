# Validation Summary: How to Prepare Control Nodes and Managed Nodes for RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible Core
- Ansible inventory and configuration files
- SSH key authentication
- sudoers configuration
- firewalld
- Python 3 on RHEL managed nodes

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Preparing a control node and managed nodes to use RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/automating_system_administration_by_using_rhel_system_roles/preparing-a-control-node-and-managed-nodes-to-use-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation, "System roles" considerations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_system-roles_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 8 documentation, Python changes in "Considerations in adopting RHEL 8": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/dynamic-programming-languages-web-servers-database-servers_considerations-in-adopting-rhel-8
- Red Hat Enterprise Linux 9 documentation, "Installing and using Python": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_installing-and-using-python_installing-and-using-dynamic-programming-languages
- Ansible documentation, inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible documentation, configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible documentation, connection methods and SSH key handling: https://docs.ansible.com/projects/ansible/2.9/user_guide/connection_details.html
- Ansible documentation, ansible.builtin.ping module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- firewalld documentation, firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- sudoers manual: https://www.sudo.ws/docs/man/1.9.14/sudoers.man/

## Issues Found
- The post stated that Python 3 is included by default on RHEL. This is too broad for RHEL 8 and minimal installations, where the relevant Python 3 package might not be installed. Updated the managed-node requirement and Python verification section to tell readers to verify Python 3 and install it if missing.
- The RHEL System Roles verification command only checked `/usr/share/ansible/roles/`, but newer RHEL releases install the `redhat.rhel_system_roles` collection under `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`. Added a collection-path verification command and clarified the `roles_path` note.
- The post said every playbook would prompt for a sudo password without `NOPASSWD`. Updated this to say Ansible must be given a sudo password, for example with `--ask-become-pass` or `become_ask_pass = true`, which is more accurate.

## Review Notes
The remaining commands and configuration snippets match current Ansible, RHEL System Roles, SSH, sudoers, and firewalld behavior. In production, disabling SSH host key checking and granting unrestricted passwordless sudo should be reviewed against the organization's security policy.
