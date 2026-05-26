# Validation Summary: How to Use Ansible Fact Caching with JSON Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible fact gathering
- Ansible fact cache plugins
- JSON file cache backend
- ansible.cfg configuration
- Bash shell commands
- YAML playbooks

## Sources Consulted
- Ansible latest configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible jsonfile cache plugin documentation: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/jsonfile_cache.html
- Ansible playbook keyword documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html

## Issues Found
- The profiling examples used `ANSIBLE_CALLBACKS_ENABLED=profile_tasks`. Current Ansible documentation shows the callback as `ansible.posix.profile_tasks`, and notes that it comes from the `ansible.posix` collection. Updated the examples to use the fully qualified callback name and added a short collection caveat.
- The production cache directory setup used `chmod 700 /var/cache/ansible/facts` after creating and changing ownership of a root-owned path with `sudo`. Updated it to `sudo chmod 700 /var/cache/ansible/facts` so the command works for a non-root shell user.
- The cache invalidation section said `gather_facts: true` forces fact re-gathering. With `gathering = smart`, the automatic gathering step can still use cached facts. Updated the text and example to show the explicit `setup` task as the refresh mechanism.
- The `gather_subset` example said it would only cache network and hardware facts, but listing subsets without excluding `all` can include the default fact set behavior. Added `!all` so the example matches the stated intent.

## Review Notes
The core `gathering = smart`, `fact_caching = jsonfile`, `fact_caching_connection`, and `fact_caching_timeout` settings are consistent with official Ansible documentation. The performance numbers are presented as example benchmarks and were not independently reproduced in this environment because Ansible is not installed locally.
