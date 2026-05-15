# Validation Summary: How to Use the RHEL sudo System Role for Centralized sudo Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- sudo RHEL system role
- Ansible and ansible-playbook
- sudoers configuration
- dnf package installation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using the sudo RHEL system role, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/using-the-sudo-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Managing sudo access, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings
- Red Hat Customer Portal: Red Hat Enterprise Linux (RHEL) System Roles, https://access.redhat.com/articles/3050101
- Linux System Roles documentation: Role README.md files, https://linux-system-roles.github.io/documentation/role-readme-md

## Issues Found
- The install command installed only `rhel-system-roles`, while Red Hat's RHEL 9 guidance installs `rhel-system-roles` with `ansible-core` for a working control node. Updated the command to install both packages.
- The playbook included the sudo role without any sudoers variables, so it did not demonstrate applying a sudo rule. Updated it to use `ansible.builtin.include_role` with `redhat.rhel_system_roles.sudo` and a `sudo_sudoers_files` example matching Red Hat's documented variable structure.
- The documentation path pointed to `/usr/share/doc/rhel-system-roles/sudo/`, which does not match current RHEL 9 documentation. Updated the commands to reference the installed sudo role README path documented by Red Hat.
- The verification step used generic service and config placeholders, but the sudo role manages sudoers configuration rather than a service. Updated verification to inspect the resulting `/etc/sudoers` entry.

## Review Notes
The corrected example grants `adminuser` permission to run all commands on all hosts. In a production article, it would be worth reminding readers to replace this with a least-privilege rule, but the example is technically valid.
