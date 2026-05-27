# Validation Summary: How to Use Ansible to Configure CentOS Stream 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- CentOS Stream 9
- DNF package management and repositories
- EPEL and CRB repositories
- SELinux
- firewalld
- chrony
- NetworkManager DNS configuration
- OpenSSH server configuration
- sysctl
- fail2ban
- dnf-automatic

## Sources Consulted
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `community.general.dnf_config_manager` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dnf_config_manager_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- CentOS Stream documentation, About Stream: https://docs.centos.org/centos-stream-docs/
- CentOS Stream documentation, Release and CRB repository notes: https://docs.centos.org/centos-stream-docs/release/
- CentOS Stream 9 package mirrors for CRB/BaseOS/AppStream/EPEL release package metadata: https://mirror.stream.centos.org/
- Fedora package metadata for `epel-release`: https://packages.fedoraproject.org/pkgs/epel-release/epel-release/epel-9.html
- Red Hat Enterprise Linux 9 basic system settings documentation for SELinux and chrony defaults: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- NetworkManager configuration manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- dnf-automatic manual page: https://man7.org/linux/man-pages/man8/dnf-automatic.8.html

## Issues Found
- The CRB repository task installed `centos-release-crb`, but current CentOS Stream 9 systems expose CRB as the `crb` repository from the standard repo package. Updated the playbook to install `dnf-plugins-core` and enable `crb` with `community.general.dnf_config_manager`, matching Ansible's documented module and CentOS guidance to use DNF config-manager.
- The automatic update task configured `upgrade_type = security`. `dnf-automatic` supports that setting, but standard CentOS Stream 9 repository metadata does not include update advisory metadata such as `updateinfo`, so security-only filtering is not reliable for CentOS Stream. Changed the example to `upgrade_type = default` and updated the summary to explain the caveat.
- The summary said CRB is provided via `centos-release-crb` and that DNF works identically to RHEL. Updated it to say CRB is enabled with DNF config-manager and to note the DNF security advisory metadata difference.

## Review Notes
The Ansible module names, YAML syntax, SELinux examples, firewalld service rules, NetworkManager `dns=none` usage, OpenSSH options, sysctl keys, fail2ban jail format, and chrony configuration are technically plausible for CentOS Stream 9. The post assumes the `community.general` and `ansible.posix` collections are available on the Ansible control node, which is consistent with the FQCNs used but could be documented in a future prerequisites section.
