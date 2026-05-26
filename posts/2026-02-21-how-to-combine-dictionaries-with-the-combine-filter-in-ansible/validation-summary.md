# Validation Summary: How to Combine Dictionaries with the combine Filter in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible playbooks
- Jinja2 filters in Ansible
- YAML
- Dictionary and list merging

## Sources Consulted
- Ansible documentation: ansible.builtin.combine filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible documentation: ansible.builtin collection filter index - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Ansible source: core filter implementation - https://github.com/ansible/ansible/blob/devel/lib/ansible/plugins/filter/core.py
- Jinja documentation: built-in filters - https://jinja.palletsprojects.com/en/stable/templates/#list-of-builtin-filters

## Issues Found
- The loop section used `config_layers | ansible.builtin.reduce('combine')` and described it as an Ansible 2.11+ one-liner. Current official Ansible builtin filter documentation does not include an `ansible.builtin.reduce` filter, and Jinja's builtin filter list does not include `reduce`. Replaced it with `config_layers | combine`, which is supported by Ansible's combine implementation for a list of dictionaries.
- The section heading used `list_merging`, but the actual combine keyword parameter is `list_merge`. Updated the heading to match the documented parameter name.
- The descriptions of `append_rp` and `prepend_rp` were simplified as "remove duplicates". Updated them to match the official Ansible documentation: `append_rp` appends newer entries and overwrites duplicates, while `prepend_rp` prepends newer entries and discards duplicates.

## Review Notes
The post's explanations of shallow versus recursive combine, rightmost precedence, and the documented `list_merge` choices align with Ansible's official combine filter documentation. Ansible is not installed in the local environment, so validation was performed against official documentation and the upstream Ansible source rather than by running playbooks locally.
