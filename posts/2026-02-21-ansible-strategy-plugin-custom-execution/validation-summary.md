# Validation Summary: How to Create a Strategy Plugin for Custom Execution Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible strategy plugins
- Ansible playbook execution strategies
- Ansible `serial` batching
- Python plugin development
- YAML playbooks and inventory
- INI-style `ansible.cfg` configuration

## Sources Consulted
- Ansible Core strategy plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/strategy.html
- Ansible playbook strategy and `serial` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible built-in `linear` strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/linear_strategy.html
- Ansible plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/plugins.html
- Ansible configuration documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Local installed `ansible-core` 2.21.0 Python source for `ansible.plugins.strategy.linear.StrategyModule`, `ansible.plugins.strategy.StrategyBase`, `ansible.executor.playbook_executor.PlaybookExecutor`, and `ansible.module_utils.urls.open_url`.

## Issues Found
- The original rolling strategy tried to split hosts into batches inside the strategy and temporarily mark non-batch hosts as unreachable with `_tqm._unreachable_hosts`. This conflicts with Ansible's execution model, where `serial` batching is handled before the strategy is invoked, and unreachable hosts affect strategy return codes. I changed the example to use the play-level `serial` keyword for batching and let the custom strategy run a health check after each serial batch.
- The original priority strategy sorted hosts but did not actually use the sorted host list when `group_by_priority` was false. It also used `_tqm._unreachable_hosts` to emulate priority groups, which has the same return-code and host-state problems as the rolling example. I changed it to override `_set_hosts_cache()` so the inherited linear strategy receives hosts in priority order, and I removed the unsupported grouping option.
- The post claimed examples such as blue-green switching and weighted batches, but the article only implemented rolling health checks and priority scheduling. I narrowed those claims to match the actual content.
- The rolling configuration showed `batch_size` as a strategy option, but Ansible's documented mechanism for host batching is the play-level `serial` keyword. I removed that option and added `serial: 3` to the playbook example.

## Review Notes
The corrected strategy examples still rely on Ansible strategy internals, which can change across ansible-core releases. For production playbooks, built-in `serial`, `order`, `throttle`, `run_once`, delegated health-check tasks, and handlers should be considered before custom strategy plugins.
