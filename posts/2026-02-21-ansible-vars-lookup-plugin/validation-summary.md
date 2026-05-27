# Validation Summary: How to Use the Ansible vars Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- ansible.builtin.vars lookup
- ansible.builtin.varnames lookup
- YAML playbooks
- Jinja2 templating in Ansible

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.vars lookup plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/vars_lookup.html
- Ansible Community Documentation: ansible.builtin.varnames lookup plugin, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/varnames_lookup.html
- Ansible Community Documentation: Lookup plugins, query, and wantlist behavior, https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Local validation with ansible-core 2.19.10 installed in /tmp for ansible-doc and targeted ad hoc lookup checks.

## Issues Found
- The post described the `vars` lookup as resolving variable names generally, but the official documentation specifies that it only returns top-level variable names. Updated the introductory explanation and "What the vars Lookup Does" section to state "top-level variable names."
- Several examples wrote files under `/etc` using `ansible.builtin.template` or `ansible.builtin.copy` without privilege escalation. These tasks would commonly fail for non-root Ansible users. Added `become: true` to the affected deployment/configuration tasks.

## Review Notes
- The short lookup names `vars` and `varnames` are valid, though the official documentation recommends fully qualified collection names such as `ansible.builtin.vars` and `ansible.builtin.varnames` for clearer linking and to avoid name conflicts.
- Verified that missing variables fail by default, `default` works for missing `vars` lookups, and multiple lookup terms return a comma-separated string unless `wantlist=True` is used.
