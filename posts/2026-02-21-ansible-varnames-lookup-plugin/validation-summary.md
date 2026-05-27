# Validation Summary: How to Use the Ansible varnames Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- `ansible.builtin.varnames` lookup
- `ansible.builtin.vars` lookup
- YAML playbooks
- Jinja2 templating in Ansible

## Sources Consulted
- Ansible documentation: `ansible.builtin.varnames` lookup - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/varnames_lookup.html
- Ansible documentation: `ansible.builtin.vars` lookup - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/vars_lookup.html
- Ansible documentation: Lookup plugins, including `query` and `wantlist=True` behavior - https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html

## Issues Found
- Several examples described matching variables by prefix, but used unanchored regular expressions such as `myapp_.*`, `feature_flag_.*`, and `env_.*`. Since `varnames` uses Python regex patterns to search variable names, these can also match names containing those strings later in the name. I changed those examples to anchored patterns such as `^myapp_.*` so the code matches the prose.
- The service-name discovery pattern used `svc_.*_port` even though the example is intended to match complete variable names ending in `_port`. I changed it to `^svc_.*_port$`.
- The role aggregation example had a task named "Build enabled checks list" but included every matching check name regardless of the variable's boolean value. I changed it to loop over discovered checks and add only those whose variable value evaluates to true.
- The dynamic INI example showed alphabetically ordered sections, but the `config_sections` expression did not sort sections. I added `sort` so the generated output matches the example.
- The regex tip used `myapp_.*` as the example for a prefix match. I changed it to `^myapp_.*` to be precise.

## Review Notes
Local `ansible` and `ansible-doc` commands were not installed in the review environment, so command-line verification was not available. The review was completed against the current official Ansible documentation. The examples that write to `/etc` assume the playbook runs with suitable privileges, such as an appropriate remote user or privilege escalation.
