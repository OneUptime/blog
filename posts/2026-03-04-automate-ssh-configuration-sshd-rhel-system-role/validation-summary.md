# Validation Summary: How to Automate SSH Configuration Using the sshd RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- OpenSSH server (`sshd`)
- YAML playbooks

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Automating system administration by using RHEL system roles, Chapter 24, "Configuring OpenSSH servers by using the sshd RHEL system role": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Red Hat Customer Portal: Red Hat Enterprise Linux (RHEL) System Roles overview and installation locations: https://access.redhat.com/articles/3050101
- Red Hat Ecosystem Catalog: `redhat.rhel_system_roles` certified Ansible collection documentation paths: https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles

## Issues Found
- The original playbook included the role but did not define any `sshd` settings, so it did not demonstrate applying an SSH server configuration. Updated the playbook to use `ansible.builtin.include_role` with `redhat.rhel_system_roles.sshd` and an `sshd_config` example for `PermitRootLogin` and `PasswordAuthentication`, matching current Red Hat documentation.
- The documentation lookup used `/usr/share/doc/rhel-system-roles/sshd/README.md`, which is not the current role README path shown in Red Hat documentation for the installed Ansible role. Updated it to `/usr/share/ansible/roles/rhel-system-roles.sshd/README.md`.
- The verification commands used placeholders for the service and configuration file. Replaced them with `systemctl status sshd` and `cat /etc/ssh/sshd_config.d/00-ansible_system_role.conf`, matching the service name and generated configuration file path documented for current RHEL releases.

## Review Notes
The post remains a minimal introduction. For a future improvement, it could mention that modern RHEL releases can install `ansible-core` alongside `rhel-system-roles` when the control node does not already have Ansible installed.
