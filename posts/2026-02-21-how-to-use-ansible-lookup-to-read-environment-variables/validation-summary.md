# Validation Summary: How to Use Ansible lookup to Read Environment Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible lookup plugins
- `ansible.builtin.env` lookup plugin
- Jinja2 filters in Ansible playbooks
- Ansible playbook variables, conditionals, templates, and assertions
- Ansible facts

## Sources Consulted
- Ansible Community Documentation: `ansible.builtin.env` lookup plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible Community Documentation: Lookup plugins, https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible Community Documentation: `ansible.builtin.assert` module, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible Community Documentation: `ansible.builtin.setup` module and fact subsets, https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- Ansible Community Documentation: Discovering variables, facts, and magic variables, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html

## Issues Found
- The "Check all required env vars at once" snippet used `map('community.general.from_csv', lookup_plugin='env')`, which is not a valid way to read environment variables from a list of names. It also had `when: false`, so the task would never run. Replaced it with a working pattern that loops through `required_env_vars`, builds a `missing_vars` list with `set_fact`, and fails once if any required variables are missing.

## Review Notes
- The post correctly states that lookup plugins, including `env`, are evaluated on the Ansible control machine.
- The post correctly states that the `env` lookup returns an empty string by default for undefined environment variables. Current ansible-core also supports the lookup-level `default=` keyword added in ansible-core 2.13, though the post's Jinja2 `default(..., true)` examples remain valid.
- Local `ansible` and `ansible-doc` binaries were not installed in this workspace, so verification was performed against official Ansible documentation rather than local command output.
