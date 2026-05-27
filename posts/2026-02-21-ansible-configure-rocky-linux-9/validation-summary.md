# Validation Summary: How to Use Ansible to Configure Rocky Linux 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Rocky Linux 9
- DNF, EPEL, and CRB repositories
- SELinux
- firewalld
- OpenSSH server hardening
- chrony
- dnf-automatic
- cron

## Sources Consulted
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `community.general.dnf_config_manager` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dnf_config_manager_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.posix.selinux` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Rocky Linux repository documentation: https://wiki.rockylinux.org/rocky/repo/
- Rocky Linux DNF package manager documentation: https://docs.rockylinux.org/guides/package_management/dnf_package_manager/
- Red Hat Enterprise Linux 9 DNF automatic update documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Rocky Linux 9 package repositories for package availability: https://dl.rockylinux.org/pub/rocky/9/
- Fedora EPEL 9 package repository for EPEL package availability: https://dl.fedoraproject.org/pub/epel/9/

## Issues Found
- The CRB enablement task tried to install a `rocky-release-crb` package and then included a disabled command fallback with `when: false`. Rocky Linux 9 provides CRB as a repository ID, not through that package name. Replaced this with installation of `dnf-plugins-core` and `community.general.dnf_config_manager` to enable the `crb` repository.
- The playbook managed firewalld but did not ensure the `firewalld` package was installed. Added `firewalld` to the essential package list.
- The automatic update task enabled `dnf-automatic.timer`, while the section describes applying security updates automatically. Updated it to `dnf-automatic-install.timer`, which is the RHEL 9 timer for downloading and installing updates.
- The common workflow used `ansible.builtin.timezone`, which is not present in current Ansible built-in module documentation. Changed it to `community.general.timezone`.
- The common Rocky Linux workflow configured UFW even though the article and Rocky/RHEL examples center on firewalld. Replaced the UFW tasks with `ansible.posix.firewalld` service rules and a systemd task to start firewalld.

## Review Notes
The SSH hardening example is syntactically valid, but `AllowGroups wheel` can lock out the configured SSH user if that user is not in `wheel`. Operators should confirm their automation user remains permitted before restarting `sshd`.
