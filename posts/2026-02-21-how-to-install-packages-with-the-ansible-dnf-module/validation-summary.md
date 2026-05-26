# Validation Summary: How to Install Packages with the Ansible dnf Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.dnf
- DNF package management
- RPM packages
- RHEL, CentOS-compatible distributions, Fedora
- DNF module streams

## Sources Consulted
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.builtin.yum` redirect documentation for ansible-core 2.17: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/yum_module.html
- Red Hat Enterprise Linux 9 documentation, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- Fedora EPEL release RPM URL checked with HTTP headers: https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

## Issues Found
- The module stream section described the explicit `dnf module reset` / `dnf module enable` commands as a "dnf module_hotfixes approach." `module_hotfixes` is a repository option, not the approach shown in the example. Changed the wording to describe it as explicit `dnf` command usage.
- The explicit module stream command examples used `changed_when: true`, which reports a change every run. Updated the examples to register command output and report changes only when the module reset or enable operation indicates a change.
- The dnf lock handling example used a shell loop around `pgrep -x dnf`. The Ansible dnf module has a built-in `lock_timeout` option for this purpose. Replaced the shell loop with `lock_timeout: 300`.
- The yum comparison stated that the yum module does not support module streams and that yum uses Python 2. Current Ansible documentation says `ansible.builtin.yum` is a redirect to `ansible.builtin.dnf`, while older yum backends used Python 2. Updated the wording to distinguish current dnf behavior from older yum backends.

## Review Notes
- The package examples are syntactically valid for Ansible YAML and align with the documented `ansible.builtin.dnf` parameters.
- The post intentionally uses distribution-specific example package names and repositories. These examples may still require the relevant repositories, subscriptions, or third-party package repositories to be available on a given target host.
