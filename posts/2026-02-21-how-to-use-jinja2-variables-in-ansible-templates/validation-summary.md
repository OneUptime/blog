# Validation Summary: How to Use Jinja2 Variables in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2
- Ansible template module
- Ansible variables, facts, magic variables, lookups, and Vault
- YAML playbooks and configuration templates

## Sources Consulted
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible env lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible default filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Jinja template designer documentation: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The variable precedence list was presented as the priority order but did not match Ansible's documented precedence. I replaced it with a corrected simplified order for common sources, including include parameters, role parameters, registered variables, `set_fact`, `include_vars`, play vars, facts, host vars, group vars, and role defaults.
- The `hostvars` example read facts from other hosts without noting that those facts must already be available. I added a short caveat that the referenced hosts' facts must be gathered or cached before reading `ansible_default_ipv4`.

## Review Notes
The examples use top-level `ansible_` fact variables, which remain available by default, but Ansible also documents the `ansible_facts` dictionary form and notes that top-level fact injection can be disabled with `INJECT_FACTS_AS_VARS`. Future updates could mention that setting if the post is expanded.
