# Validation Summary: How to Check if a Variable is Empty in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible conditionals and registered variables
- Ansible built-in modules: debug, fail, assert, template, command, find, file
- Jinja2 filters and tests
- YAML

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible bool filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/bool_filter.html
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible error handling documentation for failed_when and changed_when: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Jinja template documentation for filters and tests: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The "Universal Is Empty" example converted values to strings before checking length. This made empty lists and dictionaries appear non-empty because their string forms, such as `"[]"` and `"{}"`, have non-zero length. Updated the expression to use Jinja type tests for strings, mappings, sequences, numbers, and booleans before applying length checks.

## Review Notes
The YAML snippets parse successfully as YAML. Ansible is not installed in this workspace, so local `ansible-playbook --syntax-check` verification was not available. The reviewed patterns align with Ansible's documented use of Jinja tests and filters in conditionals, registered variable access via `stdout`, `default([])` for undefined loop input, and module parameters for `assert` and `find`.
