# Validation Summary: How to Use Ansible when with Complex Jinja2 Expressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `when` conditionals
- Jinja2 expressions, filters, and tests
- YAML playbook syntax

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible builtin plugin index for filters such as `selectattr`, `rejectattr`, `regex_search`, `split`, `zip`, and `zip_longest`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/index.html
- Jinja template designer documentation for expressions, filters, tests, and inline conditionals: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The introduction said Ansible `when` conditionals provide the "full power" of Jinja2 and listed list comprehensions. Jinja2 expressions support filters, tests, operators, and inline conditionals, but not Python-style list comprehensions. I narrowed the wording to match documented `when` expression behavior.
- The type-checking example used `type_debug` string comparison as the condition. Ansible's current tests documentation recommends type tests instead of comparing `type_debug` output. I changed the condition to use documented Jinja/Ansible type tests while keeping `type_debug` in the error message for diagnostics.
- The deployment prerequisites assertion indexed `deploy_config.allowed_versions[ansible_distribution]` directly. If the distribution was not in `allowed_os`, that later assertion could still evaluate and fail with an undefined-key error instead of a clean assertion failure. I added a `default([])` guard so unsupported distributions fail the assertion cleanly.

## Review Notes
- Ansible was not installed in the local workspace, so examples could not be executed with `ansible-playbook --syntax-check`. Review was performed against official Ansible and Jinja documentation plus local Jinja expression parsing for generic Jinja syntax.
