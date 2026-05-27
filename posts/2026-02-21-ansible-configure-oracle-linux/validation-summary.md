# Validation Summary: How to Use Ansible to Configure Oracle Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Oracle Linux 9
- Oracle Linux yum repositories
- Unbreakable Enterprise Kernel (UEK)
- firewalld
- SELinux
- chrony
- SSH hardening
- Linux sysctl configuration

## Sources Consulted
- Oracle Linux documentation: Available Yum Repositories - https://docs.oracle.com/en/operating-systems/oracle-linux/software-management/sfw-mgmt-AvailableYumRepositories.html
- Oracle Linux 9 documentation: About Linux Kernels - https://docs.oracle.com/en/operating-systems/oracle-linux/9/boot/boot-about_linux_kernels.html
- Oracle Linux 9 Kernel Version Matrix - https://docs.oracle.com/en/operating-systems/oracle-linux/9/boot/oracle_linux9_kernel_version_matrix.html
- Oracle Linux 9 documentation: Configuring the Firewall - https://docs.oracle.com/en/operating-systems/oracle-linux/9/firewall/
- Ansible documentation: community.general.timezone module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation: ansible.posix.firewalld module - https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible documentation: community.general.ufw module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible documentation: ansible.builtin.hostname module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible documentation: ansible.builtin.dnf module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html

## Issues Found
- The Oracle Linux repository list used `ol9_baseos`, but Oracle documents the Oracle Linux 9 BaseOS repository as `ol9_baseos_latest`. Updated the repository list accordingly.
- The repository list only named `ol9_UEKR7`. Oracle Linux 9 currently supports UEK R7 and UEK R8 depending on the update level and kernel stream, with UEK R8 default on recent Oracle Linux 9 releases. Updated the wording to mention `ol9_UEKR7` or `ol9_UEKR8`.
- The infrastructure workflow used `ansible.builtin.timezone`, which is not the current documented FQCN for the timezone module. Updated it to `community.general.timezone`.
- The infrastructure workflow used `community.general.ufw` for firewall configuration. UFW is a valid Ansible module when the target has the `ufw` package, but Oracle Linux 9 documents `firewalld` as the default firewall service. Updated the example to use `ansible.posix.firewalld` and `ansible.builtin.systemd`.

## Review Notes
The primary playbook uses collection modules from `community.general` and `ansible.posix`; users need those collections installed when running with `ansible-core` instead of the full Ansible package. The `state: latest` package update task is syntactically valid but may be better controlled through a patch-management workflow in production.
