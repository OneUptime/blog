# Validation Summary: How to Transform Dictionaries into Lists in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible filters and modules
- Jinja2 templating and filters
- YAML
- Python dictionary ordering semantics

## Sources Consulted
- Ansible `ansible.builtin.dict2items` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible filters guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible templating documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Jinja template filter documentation: https://jinja.palletsprojects.com/en/stable/templates/
- Python `dict` documentation: https://docs.python.org/3/library/stdtypes.html#typesmapping

## Issues Found
- The `firewalld` loop example claimed to open firewall ports but only set `permanent: true`. Because `ansible.posix.firewalld` does not apply permanent changes to the runtime configuration unless `immediate: true` is set, I added `immediate: true`.
- The nested dictionary flattening example rendered the accumulated Jinja result as a string instead of a real list when tested with ansible-core. I changed it to render YAML and parse it with `from_yaml`, so `all_servers` is a list.
- The sorting section said Python dictionaries do not guarantee ordering in older versions. I updated the wording to reflect current Python behavior: dictionaries preserve insertion order, but explicit sorting is still needed for sorted-by-key or sorted-by-value output.

## Review Notes
The examples use short filter names such as `dict2items`, `selectattr`, `map`, and `sort`, which Ansible supports. For documentation links and collision avoidance in larger collections, the official docs recommend FQCNs such as `ansible.builtin.dict2items`.
