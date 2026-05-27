# Validation Summary: How to Use Ansible Strategies for Large-Scale Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible strategy plugins
- Ansible configuration
- Ansible SSH connection settings
- Ansible fact caching
- Ansible callback plugins
- AWX and Red Hat Ansible Automation Platform controller

## Sources Consulted
- Ansible strategy plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/strategy.html
- ansible.builtin.linear strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/linear_strategy.html
- ansible.builtin.free strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/free_strategy.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.builtin.ssh connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- ansible.builtin.jsonfile cache documentation: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/jsonfile_cache.html
- community.general.redis cache documentation: https://docs.ansible.com/ansible/latest/collections/community/general/redis_cache.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- community.general.dense callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- ansible.posix.timer, profile_tasks, and profile_roles callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/
- Ansible async actions documentation: https://docs.ansible.com/ansible/2.9/user_guide/playbooks_async.html
- ansible.builtin.async_status documentation: https://docs.ansible.com/projects/ansible/2.9/modules/async_status_module.html
- Ansible error handling documentation for max_fail_percentage: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- ansible.builtin.set_stats documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- ansible.builtin.group_by documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_by_module.html
- AWX documentation: https://docs.ansible.com/projects/awx/en/24.6.1/

## Issues Found
- The initial `ansible.cfg` comment said to use the free strategy, but the actual setting was `strategy = linear`. Updated the comment to match the configured default strategy.
- `callback_whitelist` is the older callback setting. Updated examples to use `callbacks_enabled`.
- `dense`, `timer`, `profile_tasks`, and `profile_roles` are collection plugins in current documentation. Updated examples to use `community.general.dense` and `ansible.posix` callback FQCNs.
- The Redis fact cache example used the old short plugin name. Updated it to `community.general.redis` and used the current Redis connection string shape with an explicit empty password field.
- The failed-host recovery example tried to select hosts from `ansible_stats.aggregated.failed_hosts`, which is not documented as a normal later-play host selector. Replaced it with `group_by` to create an in-memory `deployment_failed` group for the recovery play.
- The AWX/Tower heading and text used the older Tower name. Updated it to AWX/Automation Controller terminology.

## Review Notes
Local Ansible was not installed in the workspace, so playbooks were not executed with `ansible-playbook --syntax-check`. Markdown whitespace was checked with `git diff --check`; YAML snippets were reviewed manually against Ansible playbook syntax and official documentation.
