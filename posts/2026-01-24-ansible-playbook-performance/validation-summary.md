# Validation Summary: How to Optimize Ansible Playbook Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible configuration
- SSH pipelining and connection multiplexing
- Fact caching and inventory caching
- Ansible strategy plugins
- Ansible async tasks
- ARA
- Mitogen

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible `ansible.posix.profile_roles` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_roles_callback.html
- Ansible `ansible.posix.timer` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible JSON file cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/jsonfile_cache.html
- Ansible inventory plugin caching documentation: https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html
- Ansible strategies documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible async task documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Community Redis cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redis_cache.html
- Community memcached cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/memcached_cache.html
- ARA usage documentation: https://ara.recordsansible.org/presentations/fosdem-2022/simple-but-useful-ansible-reporting-with-ara.html
- Mitogen changelog: https://mitogen.networkgenomics.com/changelog.html

## Issues Found
- Updated profiling examples from short callback names such as `profile_tasks`, `profile_roles`, and `timer` to their current fully qualified `ansible.posix.*` names, because these callbacks are in the `ansible.posix` collection and are not part of `ansible-core`.
- Replaced deprecated `stdout_callback = yaml` usage with `stdout_callback = default` and `callback_result_format = yaml`, which is the current Ansible callback configuration pattern.
- Removed an unsupported `gather_subset` entry from the global `ansible.cfg` summary. `gather_subset` is valid as a play keyword and setup module option, but not as the shown `[defaults]` configuration key.
- Moved the inline `fact_caching_timeout` comment onto its own line to avoid the INI value being interpreted as a non-integer.
- Changed Redis and memcached fact cache examples to `community.general.redis` and `community.general.memcached`, and noted their collection/Python-library requirements.
- Updated the async polling example from `until: job_result.finished` to the current `until: job_result is finished` idiom used in Ansible documentation.
- Corrected the loop optimization example so it no longer claims that an identical `file` module loop is faster.

## Review Notes
Ansible was not installed in the local workspace, so CLI behavior could not be verified with local `ansible-playbook --help` or `ansible-config dump`. The review was performed against current official Ansible documentation and related authoritative project documentation. Mitogen remains usable but third-party strategy plugins are deprecated in Ansible 12 / ansible-core 2.19 and may require future changes.
