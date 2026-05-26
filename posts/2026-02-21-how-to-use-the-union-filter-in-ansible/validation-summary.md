# Validation Summary: How to Use the union Filter in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible filter plugins
- Jinja2 templating in Ansible
- YAML playbooks
- Ansible builtin modules: debug, set_fact, apt, template, command

## Sources Consulted
- Ansible `ansible.builtin.union` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/union_filter.html
- Ansible `ansible.builtin.unique` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unique_filter.html
- Ansible `ansible.builtin.difference` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/difference_filter.html
- Ansible filters guide: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible loops guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html

## Issues Found
- The post claimed that `union` preserves the order of the first list and then appends new items from the second list. Official Ansible documentation states that items in a `union` result are returned in arbitrary order. Updated the basic explanation, edge cases, and order-related example text to avoid guaranteeing order and to recommend `sort` when stable output is needed.
- The post referred to `list_a + list_b | unique` as a workaround. Updated it to `(list_a + list_b) | unique` so the intended concatenation is explicit before applying `unique`.
- The comparison between `union` and concatenation plus `unique` said the approaches produce the same result. Adjusted this to say they produce the same deduplicated values in many simple cases, because `union` has arbitrary ordering and `unique` has its own comparison behavior.

## Review Notes
Ansible was not installed in the local environment, so examples were reviewed against official Ansible documentation rather than executed locally. The remaining snippets use current builtin module names and valid Ansible/Jinja2 filter syntax.
