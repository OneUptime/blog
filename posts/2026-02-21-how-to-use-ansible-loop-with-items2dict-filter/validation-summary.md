# Validation Summary: How to Use Ansible loop with items2dict Filter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible filter plugins
- Jinja2 templating
- YAML playbooks

## Sources Consulted
- Ansible `ansible.builtin.items2dict` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/items2dict_filter.html
- Ansible `ansible.builtin.dict2items` filter documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/dict2items_filter.html
- Ansible loop registration documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `ansible.builtin.from_yaml` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/from_yaml_filter.html
- Ansible `ansible.builtin.default` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html

## Issues Found
- The original registered-loop file-stat example used `community.general.dict`, which is not available in a default Ansible installation and was not declared as a dependency. Replaced that pipeline with a builtin-only approach that builds a YAML list and converts it with `from_yaml | items2dict`.
- The generated `file_list` and `version_list` variables were YAML/JSON-looking strings, not native lists, so `items2dict` rejected them in current Ansible. Added `from_yaml` before `items2dict` in both examples.
- The package-version example used `default('not installed')`, which does not replace an empty `stdout` string from a failed package query. Changed it to `default('not installed', true)` so missing packages are displayed as intended.

## Review Notes
Tested the corrected examples with a temporary current `ansible-core` installation. The host-specific examples still assume Debian-family package tooling and example service paths, which is appropriate for the stated examples but should be called out if the post is later expanded for cross-platform use.
