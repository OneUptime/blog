# Validation Summary: How to Use set_fact to Create Variables Dynamically in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.set_fact
- Ansible facts and fact caching
- Ansible playbook conditionals and loops
- Jinja2 filters in Ansible
- Ansible configuration

## Sources Consulted
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible filter guide: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible `ansible.builtin.combine` filter documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/combine_filter.html
- Ansible `ansible.builtin.zip` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/zip_filter.html
- Ansible `ansible.builtin.selectattr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible `ansible.builtin.contains` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/contains_test.html
- Ansible playbook tests guide for `contains` with `selectattr`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible `community.general.json_query` filter documentation: https://docs.ansible.com/ansible/latest/collections/community/general/json_query_filter.html

## Issues Found
- The post said `set_fact` variables persist only for the rest of the current play. Ansible documents them as host variables available to subsequent plays during the same `ansible-playbook` run, so the introduction and wrap-up were corrected.
- The `cacheable` section implied `cacheable` itself persists facts across playbook runs. Ansible documents that it works with the fact cache and does not enable fact caching by itself, so the wording was corrected.
- The backend URL example used `regex_replace('(.*)', ...)`, which can also match an empty trailing string. The pattern was changed to `^(.+)$` so each host address is transformed once.
- The team membership map example referenced `item` inside a filter pipeline where no loop item existed and applied `community.general.json_query` to the wrong input. It was replaced with an initialized dictionary plus a loop using `selectattr('teams', 'contains', item)`, matching Ansible's documented `contains` test usage with `selectattr`.

## Review Notes
The YAML code fences parse successfully with the available local PyYAML check. `ansible-playbook` is not installed in this environment, so full playbook execution was not run.
