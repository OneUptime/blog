# Validation Summary: How to Pass Extra Variables to an Ansible Playbook from Command Line

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible variables and variable precedence
- YAML and JSON extra variable formats
- Ansible Vault
- Jinja2 boolean filtering in Ansible

## Sources Consulted
- Ansible Community Documentation: ansible-playbook CLI, `-e` / `--extra-vars` option: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Using variables, including key-value, JSON, and `@` file extra vars: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Core Documentation: General precedence rules and `-e` extra variable precedence: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/general_precedence.html
- Ansible Core Documentation: `ansible.builtin.bool` filter: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/bool_filter.html
- Local Ansible Python package parser check with `ansible.utils.vars.load_extra_vars` from Ansible 2.21.0.

## Issues Found
- The multiple `-e` flags example used `-e "deploy_message=Deploying hotfix for ticket JIRA-1234"`. Ansible's key-value parser treats only `Deploying` as the value and leaves the remaining words as raw parameters, so the command would not set the intended full message. Changed that argument to JSON syntax: `-e '{"deploy_message": "Deploying hotfix for ticket JIRA-1234"}'`.
- The boolean section said command-line variables come in as strings. This is accurate for key-value syntax, but JSON/YAML extra vars can carry non-string values. Updated the wording to specify key-value syntax.

## Review Notes
- The remaining examples and claims align with the current Ansible documentation: `-e` / `--extra-vars` accepts key-value, YAML/JSON, and `@` files; it may be specified multiple times; extra vars have the highest precedence among variables; and `ansible.builtin.bool` recognizes common string forms such as `true`, `false`, `yes`, and `no`.
