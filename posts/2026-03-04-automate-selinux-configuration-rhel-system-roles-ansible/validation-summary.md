# Validation Summary: How to Automate SELinux Configuration Using RHEL System Roles and Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- RHEL System Roles
- Ansible
- Ansible Galaxy collections
- SELinux booleans, file contexts, ports, login mappings, and policy modules

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 7.9 documentation, "Configuring SELinux using System Roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/automating_system_administration_by_using_rhel_system_roles_in_rhel_7.9/configuring-selinux-using-system-roles_automating-system-administration-by-using-rhel-system-roles
- linux-system-roles SELinux role README: https://github.com/linux-system-roles/selinux
- linux-system-roles SELinux example playbook: https://raw.githubusercontent.com/linux-system-roles/selinux/main/examples/selinux-playbook.yml
- Red Hat Customer Portal RHEL System Roles overview: https://access.redhat.com/articles/3050101

## Issues Found
- The role examples used the legacy RPM role name `rhel-system-roles.selinux`. Updated the examples to the collection-qualified role name `redhat.rhel_system_roles.selinux`, which matches current Red Hat documentation and the `redhat.rhel_system_roles` Galaxy collection shown in the prerequisites.
- The prerequisite text implied the `/usr/share/ansible/roles/rhel-system-roles.selinux/` path was available for all installation methods. Clarified that this path applies to the RHEL RPM package and added the official documentation path under `/usr/share/doc/rhel-system-roles/selinux/`.
- The reboot section said the role handles rebooting after changing from `disabled` to `enforcing`. The role actually sets `selinux_reboot_required`, fails to indicate that reboot is needed, and requires the playbook to handle rebooting and reapply the role. Updated the example to use the documented `block`/`rescue` pattern.
- The idempotency section did not mention the documented caveat for SELinux module management. Added that module management is idempotent on Fedora and RHEL 8.6 or later.

## Review Notes
The remaining variables and examples for `selinux_state`, `selinux_policy`, `selinux_booleans`, `selinux_fcontexts`, `selinux_restore_dirs`, `selinux_ports`, `selinux_logins`, and `selinux_modules` match the documented SELinux role variable names and expected module-style dictionaries. `ansible-playbook` was not installed in this workspace, so command help and live syntax checks could not be run locally; CLI usage was reviewed against documented Red Hat examples instead.
