# Validation Summary: How to Use Ansible vars Lookup Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible lookup plugins
- ansible.builtin.vars lookup
- ansible.builtin.varnames lookup
- Jinja2 expressions in Ansible playbooks
- YAML playbooks

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.vars lookup - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/vars_lookup.html
- Ansible Community Documentation: ansible.builtin.varnames lookup - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/varnames_lookup.html
- Ansible Community Documentation: Lookups in playbooks - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html

## Issues Found
- The fallback section described using the Jinja `default` filter, but the example actually uses the `vars` lookup plugin's `default` keyword parameter. I changed the wording to match the documented lookup API.
- The `varnames` example used an unanchored pattern and converted lookup results with `.split(',')`. I changed the pattern to `^firewall_rule_.+` and used `query('varnames', ...)` so the loop receives a list directly, matching Ansible's documented lookup/query behavior.

## Review Notes
The remaining examples use current Ansible lookup syntax and are consistent with the official `ansible.builtin.vars` and `ansible.builtin.varnames` documentation. The short lookup names are valid for built-in plugins, though the official docs recommend fully qualified collection names for clearer documentation links and to avoid name conflicts.
