# Validation Summary: How to Use the Ansible dnf5 Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.dnf5
- ansible.builtin.dnf
- ansible.builtin.package
- DNF5
- Fedora
- RHEL-family package management

## Sources Consulted
- Ansible `ansible.builtin.dnf5` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/dnf5_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/setup_module.html
- DNF5 package management utility documentation: https://dnf5.readthedocs.io/en/stable/dnf5.8.html
- DNF5 install command documentation: https://dnf5.readthedocs.io/en/latest/commands/install.8.html
- DNF5 changes between DNF and DNF5 documentation: https://dnf5.readthedocs.io/en/latest/changes_from_dnf4.7.html
- Fedora 41 system administrator release notes: https://docs.fedoraproject.org/ca/fedora/f41/release-notes/sysadmin/
- Red Hat Enterprise Linux 10 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool

## Issues Found
- The post said Fedora 39+ ships DNF5 as the default. Fedora's official release notes state DNF5 became the default package manager in Fedora 41. Updated the introduction, compatibility matrix, availability table, and CI/CD guidance to use Fedora 41+ as the default-DNF5 line.
- The post implied the Ansible `dnf5` module provides the same core functionality as `dnf` without caveat. The official Ansible docs warn that not all `dnf` features are implemented in `dnf5`. Updated the wording to say it supports the same core package and group operations, while noting option-specific limitations.
- The complete server setup used `ansible.builtin.dnf5` with `autoremove: yes` under a task named "Clean dnf cache". In Ansible, `autoremove` removes unneeded leaf packages; it does not clean cached metadata. Replaced that task with `ansible.builtin.command: dnf5 clean all`, matching the DNF5 clean command.
- The description referred to "future RHEL systems". Since RHEL 10 is now current, updated this to "newer RHEL-family systems" to avoid outdated version wording.

## Review Notes
The main `dnf5` examples for package install, removal, repository enable/disable, RPM URL installation, local RPM installation, package groups, `name: "*"` upgrades, `autoremove`, and package-manager fact gathering match official Ansible module behavior. The post still contains broad performance claims such as "2-3x faster"; these are plausible and consistent with DNF5's stated performance goals, but exact results depend on package set, repositories, cache state, and hardware.
