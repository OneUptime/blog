# Validation Summary: How to Use the split Filter in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible filter plugins
- Jinja2 templating
- YAML playbook snippets
- Python string splitting behavior

## Sources Consulted
- Ansible `ansible.builtin.split` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/split_filter.html
- Ansible loop and extended loop variables documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible builtin filter index for `join`, `select`, `trim`, `unique`, and `zip`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Python `str.split` documentation: https://docs.python.org/3/library/stdtypes.html#str.split
- Jinja template designer documentation: https://jinja.palletsprojects.com/en/stable/templates/
- Ansible core filter source showing `split` delegates to Python `str.split`: https://github.com/ansible/ansible/blob/devel/lib/ansible/plugins/filter/core.py

## Issues Found
- The CSV parsing example used `ansible_loop.first` without enabling extended loop variables. Added `loop_control: extended: true` because Ansible only exposes `ansible_loop.first` when extended loop metadata is enabled.
- The FQDN example attempted to slice directly after a filter expression with `item | split('.')[1:]`, which is invalid Jinja syntax. Wrapped the filtered value in parentheses before slicing.
- The Apache log example attempted to index directly after a filter expression with `item | split('"')[1]` and `item | split('"')[2]`, which is invalid Jinja syntax. Wrapped the filtered value in parentheses before indexing.
- The domain reassembly example applied `join('.')` only to `parts[2:]` due to Jinja filter precedence, causing list/string concatenation to fail. Wrapped the full list concatenation expression before applying `join('.')`.

## Review Notes
Ansible was not installed in the local environment, so full playbook execution was not available. Template expressions were checked with a local Jinja harness, and the Ansible-specific behavior was cross-checked against official Ansible documentation and source. The simple CSV examples are technically valid for comma-separated data without quoted commas; a production CSV parser would be more robust for full CSV syntax.
