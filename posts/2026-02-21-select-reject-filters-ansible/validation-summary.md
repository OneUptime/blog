# Validation Summary: How to Use the select and reject Filters in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2
- YAML playbooks
- Jinja templates
- ansible.posix.firewalld
- iptables rules templates

## Sources Consulted
- Jinja Template Designer Documentation: https://jinja.palletsprojects.com/en/stable/templates/
- Ansible manipulating data documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/complex_data_manipulation.html
- Ansible tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible ansible.builtin.selectattr filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html

## Issues Found
- The post described `select` and `reject` as working only with Jinja2 tests. Updated the wording to mention both Jinja2 built-in tests and Ansible's additional tests, because later examples use Ansible-provided `match` and `search` tests.
- The iptables template comment said it used `select` to categorize ports, but the example uses `selectattr` and `rejectattr` on rule dictionaries. Updated the comment to say `selectattr` categorizes rules.
- The pattern-matching section called `match` and `search` Jinja2 tests. Updated it to identify them as Ansible tests.

## Review Notes
The core Jinja examples were spot-checked with the locally installed Jinja2 3.1.2 package. The `ansible` CLI is not installed in this environment, so Ansible-specific playbook/module behavior was verified against official Ansible documentation rather than executed locally.
