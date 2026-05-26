# Validation Summary: How to Filter Lists by Attributes in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2 filters
- Jinja2 and Ansible tests
- YAML playbooks

## Sources Consulted
- Ansible `ansible.builtin.selectattr` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible `ansible.builtin.rejectattr` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/rejectattr_filter.html
- Ansible playbook tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible `ansible.builtin.union` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/union_filter.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Jinja template designer documentation for `selectattr`, comparison tests, `defined`, `undefined`, and `in`: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The post description said the article covered custom Jinja2 tests, but the content uses built-in Jinja2 and Ansible tests. Updated the description to avoid promising an unsupported topic.
- The available-tests list described `greaterthan or equal` and `lessthan or equal` as test names. Jinja documents `ge` and `le` as the greater-than-or-equal and less-than-or-equal tests, so the list now names those tests directly.

## Review Notes
- The YAML snippets parse successfully with PyYAML.
- Ansible is not installed in this workspace, so the playbooks could not be executed with `ansible-playbook`. The examples were reviewed against current official Ansible and Jinja documentation instead.
- The `union` example is technically valid for OR logic, but Ansible documents `union` as returning a unique list in arbitrary order. Future revisions could mention that caveat if output ordering matters.
