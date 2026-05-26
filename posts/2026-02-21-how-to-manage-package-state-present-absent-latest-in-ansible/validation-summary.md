# Validation Summary: How to Manage Package State (present, absent, latest) in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.apt
- ansible.builtin.package
- ansible.builtin.package_facts
- ansible.builtin.service
- Debian/Ubuntu APT package management
- RHEL/RPM package management

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.apt module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: ansible.builtin.package module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible Community Documentation: ansible.builtin.dnf module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible Community Documentation: ansible.builtin.package_facts module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- RPM documentation: rpm erase and config files, https://ftp.rpm.org/max-rpm/s1-rpm-erase-and-config-files.html

## Issues Found
- The post said every Ansible package module has a `state` parameter. Changed this to "Most Ansible package modules" to avoid an overbroad claim.
- The post said `state: present` does nothing if a package is already installed at any version. Clarified that this behavior applies unless an exact version is specified in the package name, because the `apt` module supports version specifiers such as `foo=1.0`.
- The post said RHEL `state: absent` always removes everything. Changed this to explain that RPM-based systems do not have an apt-style purge option, but modified configuration files can be preserved with a `.rpmsave` suffix.
- The post said the cross-platform `package` module supports the same states on any distribution. Updated the wording to match Ansible documentation: `present` and `absent` are the common states, while states like `latest` depend on the underlying package module.

## Review Notes
The remaining examples use current Ansible FQCN syntax and valid module parameters. The `package_facts` example matches the documented `manager: auto` usage and `ansible_facts.packages` return structure.
