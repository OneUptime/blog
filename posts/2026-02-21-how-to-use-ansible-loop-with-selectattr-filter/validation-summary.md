# Validation Summary: How to Use Ansible loop with selectattr Filter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible playbook loops
- Ansible filters and tests
- Jinja2 filters and tests
- YAML

## Sources Consulted
- Ansible `ansible.builtin.selectattr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible playbook tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible playbook loops documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- Jinja template designer documentation for `selectattr`, `rejectattr`, `list`, and built-in tests: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The post said the listed `selectattr` tests were Jinja2 tests. Some tests shown, including `match`, `search`, `truthy`, `falsy`, and `contains`, are Ansible-provided tests rather than Jinja built-ins. Updated the wording to say `selectattr` supports Jinja2 tests and Ansible adds more tests for playbooks.
- The post said filtering an optional attribute without `defined` would throw an Ansible error. That is too absolute for this context. Updated the wording to explain that the `defined` filter keeps the intent explicit when items may omit the optional attribute.

## Review Notes
The examples use current Ansible playbook syntax and appropriate FQCNs for modules. The `community.general.ufw` example correctly uses a module from the `community.general` collection, which must be installed separately when using only `ansible-core`.
