# Validation Summary: How to Use Ansible to Configure iptables Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.iptables
- ansible.builtin.template
- ansible.posix.sysctl
- iptables
- iptables-restore
- Linux packet filtering and NAT

## Sources Consulted
- Ansible `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible 2.9 `iptables` module documentation: https://docs.ansible.com/ansible/2.9/modules/iptables_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- iptables(8) Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- iptables-restore(8) Linux manual page: https://man7.org/linux/man-pages/man8/iptables-restore.8.html
- iptables-extensions(8) Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- firewalld `firewalld.conf` documentation: https://firewalld.org/documentation/man-pages/firewalld.conf.html

## Issues Found
- The introduction said iptables is what UFW and firewalld use under the hood. This is outdated for modern firewalld, whose default backend is nftables. Updated the wording to say iptables is still widely used and that modern firewalld defaults to nftables.
- The prerequisites did not mention that `ansible.posix.sysctl` is from the `ansible.posix` collection and is not included in `ansible-core`. Added a prerequisite note for the `ansible.posix` collection when using the sysctl example.
- The NAT section said the example configured SNAT and DNAT, but the playbook uses MASQUERADE for source NAT rather than the explicit SNAT target. Updated the wording to "source NAT with MASQUERADE and DNAT."
- The flush example task was labeled "Delete all custom chains," but `iptables -X` without `-t` only operates on the default filter table. Updated the task name to "Delete custom chains in the filter table."

## Review Notes
The code examples use valid Ansible module parameters according to current Ansible documentation. The `iptables-restore --test` option is valid, although it can still require sufficient privileges on target systems. The template example is Debian/Ubuntu-oriented because it writes to `/etc/iptables/rules.v4`; other distributions may use different persistence paths or services.
