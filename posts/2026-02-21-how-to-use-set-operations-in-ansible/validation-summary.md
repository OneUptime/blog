# Validation Summary: How to Use Set Operations (union, intersect, difference) in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible built-in set operation filters: `union`, `intersect`, `difference`, `symmetric_difference`
- Ansible built-in modules: `set_fact`, `debug`, `shell`, `user`
- Jinja2 filter expressions in Ansible
- Linux shell commands used from Ansible tasks

## Sources Consulted
- Ansible `ansible.builtin.union` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/union_filter.html
- Ansible `ansible.builtin.intersect` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/intersect_filter.html
- Ansible `ansible.builtin.difference` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/difference_filter.html
- Ansible `ansible.builtin.symmetric_difference` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/symmetric_difference_filter.html
- Ansible community.general list filter guide noting Ansible Core 2.16 order behavior: https://docs.ansible.com/projects/ansible/latest/collections/community/general/docsite/filter_guide_abstract_informations_lists_helper.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `ansible.builtin.debug` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html

## Issues Found
- The original post implied deterministic ordering for built-in Ansible set filter outputs and showed exact ordered output from unsorted `union`, `intersect`, `difference`, and `symmetric_difference` expressions. Current Ansible documentation says these built-in filters return items in arbitrary order, and the community.general guide notes that Ansible Core 2.16 no longer preserves item order for these filters. I added a caveat in the introduction and added `| sort` to examples that present exact ordered output.
- After adding `sort`, I updated the affected example outputs so they match the sorted results.

## Review Notes
Ansible was not installed in the local environment, so examples were reviewed against official Ansible documentation and by static inspection rather than executing `ansible-playbook`.
