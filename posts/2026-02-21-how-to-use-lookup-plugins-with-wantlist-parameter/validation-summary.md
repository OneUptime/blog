# Validation Summary: How to Use Lookup Plugins with wantlist Parameter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible lookup plugins
- Ansible `lookup()`, `query()`, and `q()`
- Ansible playbook loops
- Jinja2 templating in Ansible

## Sources Consulted
- Ansible lookup plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible playbook lookups documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `fileglob` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- Ansible `template` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_lookup.html
- Ansible `sequence` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sequence_lookup.html
- Ansible `env` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible `file` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible `lines` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lines_lookup.html
- Ansible `inventory_hostnames` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/inventory_hostnames_lookup.html
- Ansible `dict` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict_lookup.html

## Issues Found
- The post claimed that passing the string result from `lookup()` to a loop would iterate character by character. Current Ansible documentation says the `loop` keyword requires a list and will not accept a string, so the text was corrected to say Ansible fails when a string is passed to `loop`.
- The template lookup example implied that one template term with `wantlist=True` generates multiple list items. The `template` lookup returns one rendered string per template term, so the example was changed to pass multiple template files and keep the rendered results as list items.
- The empty result section said `fileglob` without `wantlist=True` returns an empty string and included a misleading note about empty strings being truthy. Official `fileglob` documentation says no matches return an empty list, so the example and explanation were corrected.

## Review Notes
The local environment does not have `ansible` or `ansible-doc` installed, so validation was performed against current official Ansible documentation rather than by executing the playbooks locally.
