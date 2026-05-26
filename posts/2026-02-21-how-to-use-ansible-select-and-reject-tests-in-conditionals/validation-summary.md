# Validation Summary: How to Use Ansible select and reject Tests in Conditionals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2 filters
- Jinja2 tests
- YAML playbook snippets

## Sources Consulted
- Ansible `ansible.builtin.select` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/select_filter.html
- Ansible `ansible.builtin.reject` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/reject_filter.html
- Ansible `ansible.builtin.selectattr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible `ansible.builtin.rejectattr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/rejectattr_filter.html
- Ansible tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Jinja template designer documentation for `select`, `reject`, `selectattr`, `rejectattr`, `map`, and built-in tests: https://jinja.palletsprojects.com/en/stable/templates/
- Ansible `community.general.mail` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/mail_module.html

## Issues Found
- The emergency notification example used `ansible.builtin.mail`, but the current documented FQCN for the mail module is `community.general.mail`. Updated the module name so the example matches current Ansible collection documentation.

## Review Notes
The filtering examples, truthiness behavior, string matching explanation, and listed Jinja/Ansible tests were consistent with the official documentation. Ansible was not installed in the local environment, so full playbook execution was not performed; Jinja expressions for the core `select` and `reject` examples were spot-checked locally with Jinja 3.1.2.
