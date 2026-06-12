# Validation Summary: How to Build Ansible Strategy Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible strategy plugins
- ansible-core strategy internals
- Ansible playbook execution controls
- Python plugin examples
- Ansible inventory and playbook YAML
- ansible.cfg configuration

## Sources Consulted
- Ansible strategy plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/strategy.html
- ansible.builtin.linear strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/linear_strategy.html
- ansible.builtin.free strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/free_strategy.html
- ansible.builtin.host_pinned strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_pinned_strategy.html
- Ansible playbook execution strategies, forks, serial, and throttle documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible local plugin documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_locally.html
- Ansible configuration reference for strategy_plugins and ANSIBLE_STRATEGY_PLUGINS: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Installed ansible-core 2.21.0 source for StrategyBase, linear, free, and host_pinned strategy implementations.

## Issues Found
- The post listed `serial` as a built-in strategy plugin. Ansible documents `serial` as a play-level keyword that controls batching, not as a strategy plugin. I replaced it with `host_pinned` in the strategy list and added a note explaining how `serial` works with strategies.
- The descriptions of built-in strategy behavior were too loose compared with the official documentation. I adjusted `linear`, `free`, and `host_pinned` descriptions to match Ansible's documented behavior around host batches, task lockstep, and worker slots.
- Several strategy examples used `iterator.get_next_task_for_host(host)[0]` as the task. In current ansible-core, the returned tuple is state/task, so the task is the second element. I changed those examples to unpack `_, task`.
- The weighted strategy example queued tasks using stale `task_vars` from an earlier loop. I changed it to fetch variables for the current host and task before queueing.
- The canary health-check example used `result.is_failed()` and `result._host`, which do not match current ansible-core HostTaskResult objects. I changed these to `result.utr.failed` and `result.host`.
- The rate-limited strategy attempted to implement concurrency accounting inside `_queue_task()` and called `_process_pending_results(None)`, which is unsafe because result processing can require the play iterator. I revised the example to add pacing before queueing tasks and directed readers to use Ansible's built-in `forks`, `serial`, and `throttle` controls for concurrency limits.
- The configuration options example claimed `StrategyBase` automatically loads options and provides `get_option()`. In ansible-core 2.21.0, `StrategyBase` does not provide `get_option()`. I corrected the note and example to read custom strategy settings explicitly.

## Review Notes
The remaining custom strategy examples use Ansible internal strategy APIs such as `_queue_task`, `_process_pending_results`, and `_wait_on_pending_results`. These are consistent with ansible-core internals today, but they are private implementation details rather than a stable public plugin API. Production strategy plugins should be tested against the exact ansible-core versions they support.
