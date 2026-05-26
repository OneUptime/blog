# Validation Summary: How to Use String Matching in Ansible Conditionals

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and conditionals
- Jinja2 expressions, filters, operators, and tests
- Python string methods in Jinja expressions
- Ansible built-in modules: debug, command, find, set_fact, fail
- systemctl and common Linux command output parsing

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible env lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Jinja template designer documentation: https://jinja.palletsprojects.com/en/stable/templates/
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The post metadata described `match`, `search`, and `contains` as filters. Ansible documents `match`, `search`, and `regex` as tests for string matching, and the post did not demonstrate `contains`. Updated the description to refer to operators, filters, tests, and methods actually covered by the post.
- The introductory paragraph attributed the capabilities only to Jinja2 filters, Python string methods, and Ansible test plugins. Updated it to include Jinja2 operators, which covers the `in` examples accurately.
- The disk-usage example used `'9' in disk_usage.stdout.split()[-2]`, which would also match values such as `19%` and was not a reliable high-usage check. Replaced it with a regex test for `90%` through `100%`.
- The environment lookup example used `default('dev')`, but Ansible's env lookup returns an empty string for undefined variables unless using the lookup's `default` parameter or the Jinja `default` filter with the boolean flag. Changed it to `default('dev', true)`.
- The enabled-services command did not restrict `systemctl list-unit-files` to services, despite the task name and surrounding text referring to services. Added `--type=service` and made the firewalld check match `firewalld.service`.
- The "String Type Checks" section said the examples used built-in Python string methods, but two examples used regex matching. Updated the sentence to mention Python string methods and Ansible regex tests or filters.

## Review Notes
Could not run `ansible-playbook --syntax-check` locally because `ansible-playbook` is not installed in this workspace. The examples were reviewed against official Ansible, Jinja, and systemd documentation instead.
