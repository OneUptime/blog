# Validation Summary: How to Flatten Nested Lists in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible/Jinja filters: `flatten`, `map`, `dict2items`, `subelements`, `unique`, `sort`, `list`, `extract`
- Ansible registered loop results
- `ansible.builtin.debug`, `ansible.builtin.set_fact`, and `ansible.builtin.shell`
- `ansible.posix.firewalld`
- Linux `iptables`

## Sources Consulted
- Ansible `ansible.builtin.flatten` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/flatten_filter.html
- Ansible `ansible.builtin.subelements` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Ansible `ansible.builtin.dict2items` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible `ansible.builtin.map` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/map_filter.html
- Ansible `ansible.builtin.unique` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unique_filter.html
- Ansible `ansible.builtin.sort` filter documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/sort_filter.html
- Ansible loops and registered loop results documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html

## Issues Found
- The "Flattening Results from Loops" section described flattening registered loop results, but the example used only `set_fact` and did not register a loop task. Updated the example to register loop output and flatten `source_package_results.results | map(attribute='stdout_lines')`, matching Ansible's registered loop result structure.
- The `subelements` section referred to a lookup, but the code uses the `subelements` filter form. Updated the wording to call it a filter.
- The `ansible.posix.firewalld` example used `permanent: true` without `immediate: true`, so it would update the permanent firewalld configuration but not apply the rule to the running configuration immediately. Added `immediate: true` so the "Apply firewall rules" task behaves as described.

## Review Notes
Ansible was not installed in the local workspace, so examples were reviewed against official Ansible documentation rather than executed locally. The core `flatten`, `levels`, `subelements`, `dict2items`, `unique`, `sort`, and registered-loop-result behavior matched the official documentation after the corrections above.
