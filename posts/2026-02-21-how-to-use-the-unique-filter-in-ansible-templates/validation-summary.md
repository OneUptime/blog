# Validation Summary: How to Use the unique Filter in Ansible Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible filter plugins
- Jinja2 templates and filters
- YAML playbook snippets

## Sources Consulted
- Ansible `ansible.builtin.unique` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/unique_filter.html
- Ansible playbook filter guide: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Jinja built-in `unique` filter documentation: https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.unique
- Jinja built-in `sort` filter documentation: https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.sort
- Ansible `unique` filter implementation: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/filter/mathstuff.py

## Issues Found
- The post incorrectly stated that `unique` is not part of standard Jinja2 and is Ansible-specific. Updated the text to explain that Ansible provides `ansible.builtin.unique` and modern Jinja2 also includes a `unique` filter.
- The post implied that deduplicating dictionaries by attribute required mapping to the attribute first. Updated the example to use the documented `unique(attribute='name')` parameter when keeping dictionaries, while preserving the `map(attribute='name')` pattern for cases where only the names are needed.
- The post incorrectly stated that `unique` is case-sensitive by default. Updated the section to reflect the documented default `case_sensitive=false`, corrected the expected output, and added the correct `case_sensitive=true` example for case-sensitive behavior.

## Review Notes
Ansible was not installed in the local environment, so Ansible behavior was verified against official documentation and the Ansible source implementation. Jinja2 behavior was also spot-checked locally with Jinja2 3.1.2.
