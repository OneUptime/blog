# Validation Summary: How to Cache Ansible Facts Between Playbook Runs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible fact gathering
- Ansible cache plugins
- JSON file fact caching
- Redis fact caching
- Memcached fact caching
- YAML file fact caching
- Ansible callback plugins

## Sources Consulted
- Ansible cache plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- Ansible configuration settings, including `DEFAULT_GATHERING`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- `ansible.builtin.jsonfile` cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/jsonfile_cache.html
- `community.general.redis` cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redis_cache.html
- `community.general.memcached` cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/memcached_cache.html
- `community.general.yaml` cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_cache.html
- `ansible-playbook` CLI documentation for `--flush-cache`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html

## Issues Found
- Redis, Memcached, and YAML cache examples used short plugin names without noting that these plugins are in `community.general` and not included in `ansible-core`. Updated the examples to install `community.general` and use `community.general.redis`, `community.general.memcached`, and `community.general.yaml`.
- The Redis verification example inspected Redis keys directly. Current Ansible cache plugin documentation says cache storage is an implementation detail and should be used indirectly. Replaced the Redis CLI key inspection example with an Ansible playbook that reads cached facts through `hostvars`.
- The Redis connection string explanation omitted the optional password field documented by the plugin. Updated the description to `host:port:database_number:password`, with the password omitted when not required.
- The Memcached INI example used a Python-style list literal for `fact_caching_connection`. Updated it to the current documented INI form, `localhost:11211`.
- The `gathering = explicit` explanation said the cache is irrelevant. Current Ansible configuration documentation says both `smart` and `explicit` use the cache plugin, so the wording was corrected.
- The cache-clearing examples included Redis key deletion through `redis-cli`. Replaced it with `ansible-playbook --flush-cache`, which is the documented CLI option for clearing the configured fact cache for hosts in inventory.
- The YAML cache example used the short `yaml` cache plugin name and did not mention the collection requirement. Updated it to install `community.general` and use `community.general.yaml`.
- The `profile_tasks` callback example used the short callback name without noting that it is in `ansible.posix`. Updated the example to install `ansible.posix` and use `callbacks_enabled = ansible.posix.profile_tasks`.
- The infrastructure invalidation playbook removed jsonfile cache files directly, which only worked for one backend. Replaced it with `ansible.builtin.meta: clear_facts`, which clears gathered facts including the configured fact cache for the play's hosts.

## Review Notes
- The local environment did not have Ansible installed, so command behavior was verified against official Ansible documentation rather than local `ansible-doc` output.
- The post still includes manual file-cache deletion examples for the jsonfile backend. That is acceptable for backend-specific troubleshooting, but `--flush-cache` or `meta: clear_facts` is more portable across cache plugins.
