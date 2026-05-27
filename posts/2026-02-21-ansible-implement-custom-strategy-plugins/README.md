# How to Implement Custom Strategy Plugins in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Strategy Plugins, Python, Plugin Development

Description: Build custom Ansible strategy plugins to implement specialized execution models like weighted rollouts, dependency-aware ordering, and circuit breakers.

---

Ansible's built-in strategies (linear, free, host_pinned) cover most use cases, but sometimes you need execution logic that does not fit any of them. Custom strategy plugins let you define exactly how tasks are dispatched to hosts, in what order, and under what conditions. This is advanced territory, but the result is a strategy tailored to your specific deployment needs.

## Strategy Plugin Architecture

A strategy plugin is a Python class that inherits from `StrategyBase`. Its main job is to implement the `run()` method, which orchestrates task execution across hosts. The strategy decides:

- Which host gets which task next
- How many hosts run simultaneously
- When to proceed to the next task
- How to handle failures

## Minimal Strategy Plugin

Here is the simplest possible strategy plugin: it delegates to the built-in linear strategy and adds a small amount of logging.

```python
# strategy_plugins/logged_linear.py - Linear strategy with custom logging

from ansible.plugins.strategy.linear import StrategyModule as LinearStrategy


class StrategyModule(LinearStrategy):
    """Run the normal linear strategy with custom debug output."""

    def run(self, iterator, play_context):
        self._display.v("logged_linear strategy: starting")
        result = super().run(iterator, play_context)
        self._display.v(f"logged_linear strategy: complete, result={result}")
        return result
```

This extends the linear strategy without changing its scheduling behavior. If you want to run the entire play on one host before moving to the next, use the play-level `serial: 1` keyword instead of a custom strategy.

## Understanding the Strategy Base Class

The `StrategyBase` class provides these key methods:

```python
# Key methods in StrategyBase that custom strategies use
class StrategyBase:
    def run(self, iterator, play_context):
        """Main execution loop. Override this."""
        pass

    def _execute_meta(self, task, play_context, iterator, target_host):
        """Execute a meta task (flush_handlers, etc.)."""
        pass

    def _queue_task(self, host, task, task_vars, play_context):
        """Queue a task for execution on a host."""
        pass

    def _process_pending_results(self, iterator, one_pass=False):
        """Process results from queued tasks."""
        pass

    def _wait_on_pending_results(self, iterator):
        """Wait for all pending results to complete."""
        pass
```

## Building a Circuit Breaker Strategy

Here is a more practical example: a strategy that monitors failure rates and stops execution when failures exceed a dynamic threshold:

```python
# strategy_plugins/circuit_breaker.py
from ansible.plugins.strategy.linear import StrategyModule as LinearStrategy
from ansible.errors import AnsibleError


DOCUMENTATION = '''
    name: circuit_breaker
    short_description: Linear strategy with circuit breaker pattern
    description:
        - Extends linear strategy with automatic circuit breaking
        - Monitors failure rate over a sliding window
        - Stops execution when failure rate exceeds threshold
    options:
        failure_threshold:
            description: Maximum failure percentage before tripping
            default: 25
            env:
                - name: ANSIBLE_CIRCUIT_BREAKER_THRESHOLD
            ini:
                - section: circuit_breaker
                  key: failure_threshold
        window_size:
            description: Number of recent results to consider
            default: 10
            env:
                - name: ANSIBLE_CIRCUIT_BREAKER_WINDOW
            ini:
                - section: circuit_breaker
                  key: window_size
'''


class StrategyModule(LinearStrategy):
    """Linear strategy with circuit breaker pattern."""

    def __init__(self, tqm):
        super().__init__(tqm)
        self._failure_window = []
        self._threshold = 25
        self._window_size = 10
        self._circuit_open = False

    def _check_circuit(self):
        """Check if the circuit breaker should trip."""
        if len(self._failure_window) < self._window_size:
            return False

        recent = self._failure_window[-self._window_size:]
        failure_rate = sum(1 for r in recent if r == 'failed') / len(recent) * 100

        if failure_rate > self._threshold:
            self._display.warning(
                f"Circuit breaker tripped: {failure_rate:.0f}% failure rate "
                f"exceeds {self._threshold}% threshold"
            )
            return True
        return False

    def _process_pending_results(self, iterator, one_pass=False):
        """Override to track results in the failure window."""
        results = super()._process_pending_results(iterator, one_pass)

        # Track success/failure in the sliding window
        for result in results:
            if result.utr.failed or result.utr.unreachable:
                self._failure_window.append('failed')
            else:
                self._failure_window.append('ok')

        # Check circuit breaker
        if self._check_circuit():
            self._circuit_open = True
            raise AnsibleError("Circuit breaker tripped; stopping play execution")

        return results
```

## Strategy Plugin with Host Weighting

A strategy that processes hosts in priority order based on a host variable:

```python
# strategy_plugins/weighted.py - Process hosts by priority weight
from ansible.plugins.strategy.linear import StrategyModule as LinearStrategy


DOCUMENTATION = '''
    name: weighted
    short_description: Process hosts in priority order
    description:
        - Processes hosts sorted by a weight variable
        - Higher weight hosts are processed first
'''


class StrategyModule(LinearStrategy):
    """Process hosts sorted by weight variable."""

    def _get_host_weight(self, play, host):
        """Get the weight for a host from its variables."""
        host_vars = self._variable_manager.get_vars(
            play=play,
            host=host,
            _hosts=self._hosts_cache,
            _hosts_all=self._hosts_cache_all,
        )
        return int(host_vars.get('priority_weight', 0))

    def _set_hosts_cache(self, play, refresh=True):
        """Override host cache setup to sort hosts by weight."""
        super()._set_hosts_cache(play, refresh)
        hosts_by_name = {
            host.name: host
            for host in self._inventory.get_hosts(play.hosts, order=play.order)
        }
        self._hosts_cache.sort(
            key=lambda name: self._get_host_weight(play, hosts_by_name[name]),
            reverse=True,
        )

    def run(self, iterator, play_context):
        """Run with hosts sorted by weight."""
        result = super().run(iterator, play_context)
        self._display.display(
            f"Host execution order (by weight): "
            f"{self._hosts_cache}"
        )
        return result
```

Use it with host variables:

```ini
# inventory
[webservers]
web-canary priority_weight=100   # Processed first (canary)
web-01     priority_weight=50    # Processed second
web-02     priority_weight=50
web-03     priority_weight=10    # Processed last
```

## Installing Custom Strategy Plugins

Place your strategy plugin in one of these locations:

```text
# Project-level (recommended)
your_project/
  strategy_plugins/
    circuit_breaker.py
    weighted.py
  ansible.cfg
  playbooks/
```

Configure the path in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
strategy_plugins = ./strategy_plugins
strategy = circuit_breaker  # Use your custom strategy as default
```

Or use it per-play:

```yaml
- name: Deploy with circuit breaker
  hosts: webservers
  strategy: circuit_breaker

  tasks:
    - name: Deploy application
      include_role:
        name: deploy
```

## Testing Strategy Plugins

Test with a playbook that exercises different scenarios:

```yaml
# test-strategy.yml - Test custom strategy behavior
---
- name: Test custom strategy
  hosts: test-hosts
  strategy: circuit_breaker

  tasks:
    - name: Task that succeeds
      command: /bin/true

    - name: Task that might fail
      command: "{{ 'false' if inventory_hostname in groups['flaky'] else 'true' }}"
      ignore_errors: true

    - name: Task after potential failures
      debug:
        msg: "Still running after failures"
```

## Debugging Strategy Plugins

Add display messages to track execution flow:

```python
def run(self, iterator, play_context):
    self._display.v("Custom strategy: starting execution")
    self._set_hosts_cache(iterator._play)
    self._display.vv(
        f"Custom strategy: {len(self.get_hosts_left(iterator))} hosts remaining"
    )
    result = super().run(iterator, play_context)
    self._display.v(f"Custom strategy: execution complete, result={result}")
    return result
```

Run with verbose flags to see the debug output:

```bash
ansible-playbook -vv site.yml
```

## Strategy Plugin Limitations

Custom strategies are powerful but come with caveats:

- The internal API is not fully documented and can change between Ansible versions
- Extending existing strategies is safer than building from scratch
- Testing across different Ansible versions is important
- Complex strategies can be hard to debug

For most custom execution needs, consider whether `serial`, `throttle`, `max_fail_percentage`, and `order` can achieve what you need before writing a custom strategy. These are simpler, well-tested mechanisms that cover 90% of use cases.

Custom strategy plugins are the escape hatch for the other 10% where built-in mechanisms are not enough. When you need it, having the ability to write your own execution model is invaluable.
