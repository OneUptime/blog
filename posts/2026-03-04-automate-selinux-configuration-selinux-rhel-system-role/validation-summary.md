# Validation Summary: How to Automate SELinux Configuration Using the selinux RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- SELinux
- Ansible
- YAML
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Configuring SELinux by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/automating_system_administration_by_using_rhel_system_roles/configuring-selinux-by-using-rhel-system-roles
- Red Hat Enterprise Linux 7.9 documentation: Configuring SELinux using System Roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/automating_system_administration_by_using_rhel_system_roles_in_rhel_7.9/configuring-selinux-using-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux System Roles catalog, https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles
- Linux System Roles selinux role README, https://github.com/linux-system-roles/selinux

## Issues Found
- The playbook included the SELinux role but did not define any SELinux state or boolean variables, even though the post claims to automate SELinux mode and boolean settings. I added `selinux_policy`, `selinux_state`, and `selinux_booleans` variables using the structure documented by the role.
- The verification step used placeholders for a service and config file, which are not correct SELinux verification commands. I replaced them with `getenforce`, `/etc/selinux/config`, and `getsebool ssh_sysadm_login` checks.

## Review Notes
Changing SELinux from `disabled` to an enabled mode can require a reboot and rerunning the role, as documented by the selinux role. The post remains a concise introductory example and does not cover that advanced flow.
