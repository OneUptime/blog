# Validation Summary: How to Use Ansible loop to Install Multiple Packages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `loop`
- `ansible.builtin.apt`
- `ansible.builtin.dnf`
- Package management on Debian/Ubuntu and RHEL-family systems
- Ansible `register`, conditionals, and error handling

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.builtin.yum` redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible error handling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible generic package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html

## Issues Found
- The post described `yum` as the RHEL/CentOS package module to use. Current Ansible documentation redirects `ansible.builtin.yum` to `ansible.builtin.dnf`, and notes that the old YUM backend was removed in ansible-core 2.17. I changed the text and cross-platform example to use `ansible.builtin.dnf` and `dnf_name`.
- The efficient install section said the `apt` list example runs an exact `apt-get install ...` command. The Ansible module documentation guarantees list input and package installation behavior, not that exact command line. I reworded this as a single package manager operation.
- The version pinning introduction said package versions should be pinned in production. That is too absolute, and pinned versions must exist in configured repositories. I narrowed the claim to versions available from configured repositories.

## Review Notes
The examples use `ansible.builtin.apt` for Debian/Ubuntu and `ansible.builtin.dnf` for RHEL-family systems, both of which support lists in `name`/`pkg`. Ansible's loop documentation explicitly recommends passing package lists directly to package modules when available because looping processes packages individually and can be slower or problematic with interdependencies. The pinned package versions are examples only; real playbooks should use versions available in the target host's configured repositories.
