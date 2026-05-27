# Validation Summary: How to Implement Custom Strategy Plugins in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible strategy plugins
- Ansible playbook execution strategies
- Python plugin development
- Ansible configuration
- YAML and INI inventory snippets

## Sources Consulted
- Ansible strategy plugins documentation: https://docs.ansible.com/ansible/latest/plugins/strategy.html
- Ansible playbook strategies documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible playbook keywords reference: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- ansible.builtin.linear strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/linear_strategy.html
- ansible.builtin.host_pinned strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_pinned_strategy.html
- Ansible upstream StrategyBase source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/strategy/__init__.py
- Ansible upstream linear strategy source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/strategy/linear.py

## Issues Found
- The minimal strategy example claimed to run the entire play on one host before moving to the next by setting `self._tqm._options.forks = 1`. That is not reliable because strategy workers are already created by the task queue manager, and linear scheduling still advances task-by-task across hosts. Replaced it with a safe minimal linear-derived plugin and clarified that `serial: 1` is the play-level mechanism for running the whole play one host at a time.
- The circuit breaker example said it stopped execution, but the code only set `_circuit_open` and never acted on it. Updated it to raise `AnsibleError` when the circuit trips.
- The circuit breaker example used `result.is_failed()` and checked for `_result`, which does not match current strategy result objects in Ansible's upstream strategy code. Updated it to inspect `result.utr.failed` and `result.utr.unreachable`.
- The weighted strategy example sorted hosts into a local variable but never changed the host order used by the linear strategy. Updated it to sort `_hosts_cache` during host cache setup so the strategy actually uses the weighted ordering.
- The weighted inventory snippet was fenced as YAML even though it used INI inventory syntax. Updated the code fence to `ini`.
- The debugging example referenced `self._hosts_left`, which is not part of the current `StrategyBase` API. Updated it to use `self.get_hosts_left(iterator)` after setting the host cache.

## Review Notes
Custom strategy plugins rely heavily on Ansible internals, and the post now notes that this API can change between versions. The examples are still intentionally compact and should be tested against the exact ansible-core versions used in production.
