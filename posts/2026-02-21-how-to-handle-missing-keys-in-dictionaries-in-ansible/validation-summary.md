# Validation Summary: How to Handle Missing Keys in Dictionaries in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Jinja2 templating
- Ansible filters and tests
- YAML configuration

## Sources Consulted
- Ansible Core documentation: Using filters to manipulate data - https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible Core documentation: ansible.builtin.combine filter - https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/combine_filter.html
- Ansible Core documentation: Blocks - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible Core documentation: Test plugins - https://docs.ansible.com/projects/ansible-core/devel/plugins/test.html
- Ansible documentation: ansible.builtin.debug module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Jinja documentation: Template Designer Documentation - https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The post said `{{ config.database.host | default('localhost') }}` still fails when `config.database` is missing. Current Ansible documentation states that since Ansible 2.8, accessing an attribute of an undefined value returns another undefined value, allowing `default` to catch missing intermediate values in nested paths. I changed the text to say the example works in current Ansible and kept the per-level default pattern as an older-version compatibility and normalization option.
- The description mentioned "ternary" and "try/rescue" even though the post does not include a ternary example and Ansible's documented construct is `block`/`rescue`, not `try`/`rescue`. I updated the description to list the patterns actually covered: `default`, `defined`, `dict.get()`, `omit`, `combine`, and `block/rescue`.

## Review Notes
- `default(omit)`, `combine(..., recursive=true)`, `selectattr` with tests, Python method calls such as `dict.get()`, and `block`/`rescue` usage are consistent with the official documentation.
- I could not run the examples locally because `ansible-playbook` is not installed in this environment; validation was performed against official Ansible and Jinja documentation.
