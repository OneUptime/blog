# Validation Summary: How to Handle Partial Failures in Ansible with Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible strategy plugins (`linear`, `free`, `host_pinned`)
- Ansible error handling (`block`, `rescue`, `always`, `ignore_errors`, `failed_when`)
- Ansible rolling deployment controls (`serial`, `max_fail_percentage`)
- Ansible `set_stats`
- Ansible retry files and `--limit`

## Sources Consulted
- Ansible documentation: Controlling playbook execution: strategies and more - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible documentation: Error handling in playbooks - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible documentation: Blocks - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible documentation: `ansible.builtin.set_stats` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- Ansible documentation: Configuration settings (`RETRY_FILES_ENABLED`, `RETRY_FILES_SAVE_PATH`) - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible documentation: `ansible.builtin.host_pinned` strategy - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_pinned_strategy.html
- Local validation with ansible-core 2.21.0 installed into `/tmp/ansible-review-target` for `set_stats` behavior.

## Issues Found
- The introduction described all mechanisms as strategy-level. `ignore_errors`, `failed_when`, `block/rescue`, `serial`, and `max_fail_percentage` are playbook controls or play/task keywords rather than all being strategy plugins. Changed this to "playbook-level mechanisms."
- The first recap example showed `ok=0` for a failed host while fact gathering would normally add a successful task before the failing task. Added `gather_facts: false` to the example so the recap matches the shown task counts.
- The retry-file section said Ansible automatically creates `.retry` files on failure. Current Ansible configuration defaults `retry_files_enabled` to `False`, so retry files are only created when enabled. Updated both retry-file references to make that condition explicit.
- The `set_stats` example tried to read `ansible_stats.aggregated.failed_hosts` in a later task. Local testing with ansible-core 2.21.0 showed `ansible_stats` is not available as a normal play variable. Removed the invalid `post_tasks` debug example and added the documented requirement to enable `show_custom_stats` or `ANSIBLE_SHOW_CUSTOM_STATS=true` to display custom stats at the end of a run.

## Review Notes
The examples still use short module names such as `apt`, `service`, `uri`, and `set_stats`. These remain supported, though Ansible documentation generally recommends fully qualified collection names such as `ansible.builtin.apt` for clarity and linkability.
