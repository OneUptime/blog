# Validation Summary: How to Set gather_facts to False to Speed Up Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible facts
- `gather_facts`
- `ansible.builtin.setup`
- Ansible fact caching
- YAML

## Sources Consulted
- Ansible playbook keywords documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- `ansible.builtin.jsonfile` cache plugin documentation: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/jsonfile_cache.html

## Issues Found
- The post said to manually call the `setup` module "with a filter" while the examples used `gather_subset`. Changed "filter" to "subset" because `filter` and `gather_subset` are separate `setup` module parameters.
- The selective facts example used only `gather_subset: network` while describing it as gathering only network facts. Official Ansible documentation states that `gather_subset` includes the minimum subset unless `!all` and `!min` are used. Added `!all` and `!min` to the selective example and updated the comparison diagram to match.
- The subset list was very short and could imply the listed values were complete. Updated it to say the listed subsets are examples and added several documented specific subsets.
- The Red Hat package installation example used `yum`. Current Ansible documentation lists `ansible.builtin.dnf` as the package manager module for DNF-based systems, with `yum` as an alias/redirect in modern cores. Changed the example to `dnf`.

## Review Notes
The local environment did not have `ansible-playbook` or `ansible-doc` installed, so validation was performed against current official Ansible documentation. The timing numbers remain illustrative and environment-dependent rather than guaranteed benchmark results.
