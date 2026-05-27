# Validation Summary: How to Use Ansible to Configure AlmaLinux 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventories
- AlmaLinux 9
- RHEL-family Linux administration
- DNF package and repository management
- EPEL and CRB repositories
- SELinux
- firewalld
- OpenSSH server configuration
- chrony
- dnf-automatic
- sysctl

## Sources Consulted
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `community.general.dnf_config_manager` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dnf_config_manager_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.posix.selinux` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/selinux_module.html
- Ansible `ansible.posix.seboolean` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- AlmaLinux repository documentation: https://wiki.almalinux.org/repos/AlmaLinux
- DNF config-manager plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/config_manager.html
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/using_selinux/Red_Hat_Enterprise_Linux-9-Using_SELinux-en-US.pdf
- Red Hat Enterprise Linux 9 OpenSSH configuration notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_security_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 chrony documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings

## Issues Found
- The post said AlmaLinux repository names use an `almalinux` prefix. AlmaLinux 9 repository IDs are names such as `baseos`, `appstream`, `extras`, and `crb`, so the repository bullet was corrected.
- The CRB repository task used a raw `dnf config-manager` command with `changed_when: true`. The command requires `dnf-plugins-core` and is not idempotent as written, so the playbook now installs `dnf-plugins-core` and uses `community.general.dnf_config_manager`.
- The package list omitted `firewalld` while later tasks manage the service and use `ansible.posix.firewalld`. `firewalld` was added to the package lists.
- The SELinux boolean example checked `group_names` for `web`, but the sample inventory does not define a `web` group. The condition now checks `inventory_hostname`, matching the provided `alma-web01` naming pattern.
- The summary claimed any RHEL role works on AlmaLinux 9 without modification. This was too broad because subscription management and RHEL-specific repository IDs can require changes, so the statement was narrowed.
- The common use case section referred to "this module" even though the post is a playbook guide, not a module reference. This was changed to "this approach."
- The infrastructure workflow used `ansible.builtin.timezone`, which is not an Ansible builtin module. It now uses `community.general.timezone`.
- The infrastructure workflow used UFW, which is not the standard firewall service for AlmaLinux/RHEL examples and conflicted with the rest of the post. It now uses `firewalld` through `ansible.posix.firewalld`.

## Review Notes
The post is technically relevant and the corrected examples align with current Ansible collection documentation and AlmaLinux 9 repository behavior. The examples assume the `community.general` and `ansible.posix` collections are available on the control node.
