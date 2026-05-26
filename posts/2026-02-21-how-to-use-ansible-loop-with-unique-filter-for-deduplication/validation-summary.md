# Validation Summary: How to Use Ansible loop with unique Filter for Deduplication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `loop`
- Ansible `ansible.builtin.unique` filter
- Ansible `ansible.builtin.apt`, `ansible.builtin.user`, `ansible.builtin.set_fact`, and `ansible.builtin.debug` modules
- `community.general.ufw` module
- YAML

## Sources Consulted
- Ansible `ansible.builtin.unique` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unique_filter.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible/8/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The post stated that `unique` is case-sensitive by default. Official Ansible documentation says `case_sensitive` defaults to `false`, so I corrected the section to say `unique` is case-insensitive by default and that `map('lower')` is useful when normalized lowercase output is desired.
- The post described attribute-based deduplication as requiring a manual `map` plus lookup pattern. Official Ansible documentation supports `unique(attribute='...')`, so I replaced the manual loop with `unique(attribute='name')`.
- The summary said `| list` is always required after `unique` because `unique` returns a generator. Official Ansible documentation says the filter returns a list, so I removed that claim.
- The performance section claimed hash-based comparison and "fast even for 10,000+ items" without support in the official documentation. I narrowed the wording to the verified point that deduplication happens on the control node before redundant module invocations are sent to managed hosts.
- The DNS example task name said it was getting unique DNS record names while the code deduplicated full records. I updated the task name to match the implementation.

## Review Notes
The `ansible.builtin.apt` examples are technically valid, but Ansible documentation notes that passing a package list directly to the `name` option is more efficient than looping when using package modules. The post already demonstrates that better pattern in the multi-role example.
