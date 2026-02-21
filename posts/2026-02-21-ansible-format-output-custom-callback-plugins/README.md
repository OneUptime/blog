# How to Format Ansible Output with Custom Callback Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Output Formatting, Python

Description: Create custom Ansible stdout callback plugins to control output formatting, add colors, include timestamps, and filter task results for cleaner displays.

---

The default Ansible output works for most situations, but sometimes you need something different: colored output based on custom rules, filtered results that hide noise, table-formatted summaries, or output tailored for a specific audience. Custom stdout callback plugins give you complete control over what appears in the terminal and how it looks.

## Understanding stdout Callbacks

A stdout callback replaces the entire terminal output. When you write one, you are responsible for displaying everything: play names, task names, host results, and the final recap. Only one stdout callback can be active at a time.

The key difference from notification callbacks: stdout callbacks use `CALLBACK_TYPE = 'stdout'` and do not need to be whitelisted (they are set with `stdout_callback` in the config).

## Building a Timestamp Callback

Adding timestamps to every line helps when reviewing long playbook runs:

```python
# callback_plugins/timestamped.py - Add timestamps to all output
from datetime import datetime
from ansible.plugins.callback.default import CallbackModule as DefaultCallback


class CallbackModule(DefaultCallback):
    """Adds timestamps to the default callback output."""

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'timestamped'

    def _timestamp(self):
        return datetime.now().strftime('%H:%M:%S')

    def v2_playbook_on_play_start(self, play):
        ts = self._timestamp()
        name = play.get_name().strip()
        self._display.banner(f"[{ts}] PLAY [{name}]")

    def v2_playbook_on_task_start(self, task, is_conditional):
        ts = self._timestamp()
        name = task.get_name().strip()
        self._display.banner(f"[{ts}] TASK [{name}]")

    def v2_runner_on_ok(self, result):
        ts = self._timestamp()
        host = result._host.get_name()
        changed = result._result.get('changed', False)
        status = 'changed' if changed else 'ok'
        color = 'yellow' if changed else 'green'
        self._display.display(f"  [{ts}] {status}: [{host}]", color=color)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        ts = self._timestamp()
        host = result._host.get_name()
        msg = result._result.get('msg', '')
        color = 'bright purple' if ignore_errors else 'red'
        label = 'ignored' if ignore_errors else 'failed'
        self._display.display(f"  [{ts}] {label}: [{host}] => {msg}", color=color)

    def v2_runner_on_skipped(self, result):
        ts = self._timestamp()
        host = result._host.get_name()
        self._display.display(f"  [{ts}] skipped: [{host}]", color='cyan')

    def v2_runner_on_unreachable(self, result):
        ts = self._timestamp()
        host = result._host.get_name()
        self._display.display(f"  [{ts}] unreachable: [{host}]", color='red')

    def v2_playbook_on_stats(self, stats):
        ts = self._timestamp()
        self._display.banner(f"[{ts}] PLAY RECAP")
        hosts = sorted(stats.processed.keys())
        for h in hosts:
            s = stats.summarize(h)
            msg = (
                f"  {h:<30} ok={s['ok']:<4} changed={s['changed']:<4} "
                f"unreachable={s['unreachable']:<4} failed={s['failures']}"
            )
            if s['failures'] > 0:
                self._display.display(msg, color='red')
            elif s['changed'] > 0:
                self._display.display(msg, color='yellow')
            else:
                self._display.display(msg, color='green')
```

Output:

```
[10:15:23] PLAY [Configure web servers] **************************************
[10:15:23] TASK [Gathering Facts] ********************************************
  [10:15:25] ok: [web-01]
  [10:15:26] ok: [web-02]
[10:15:26] TASK [Install nginx] **********************************************
  [10:15:38] ok: [web-01]
  [10:15:40] changed: [web-02]
[10:15:40] PLAY RECAP ********************************************************
  web-01                         ok=2   changed=0   unreachable=0   failed=0
  web-02                         ok=2   changed=1   unreachable=0   failed=0
```

## Building a Failures-Only Callback

Show only failures and the recap, hiding all successful tasks:

```python
# callback_plugins/failures_only.py - Only show failures and recap
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    """Only displays failures and the play recap."""

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'failures_only'

    def __init__(self):
        super().__init__()
        self._task_name = ''
        self._failure_count = 0

    def v2_playbook_on_play_start(self, play):
        name = play.get_name().strip()
        self._display.banner(f"PLAY [{name}]")

    def v2_playbook_on_task_start(self, task, is_conditional):
        self._task_name = task.get_name().strip()

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if ignore_errors:
            return
        self._failure_count += 1
        host = result._host.get_name()
        msg = result._result.get('msg', 'No error message')
        self._display.display(
            f"FAILED [{self._task_name}] on {host}: {msg}",
            color='red'
        )

    def v2_runner_on_unreachable(self, result):
        self._failure_count += 1
        host = result._host.get_name()
        self._display.display(
            f"UNREACHABLE: {host}",
            color='red'
        )

    def v2_playbook_on_stats(self, stats):
        self._display.banner("PLAY RECAP")
        hosts = sorted(stats.processed.keys())
        for h in hosts:
            s = stats.summarize(h)
            msg = (
                f"{h:<30} ok={s['ok']:<4} changed={s['changed']:<4} "
                f"unreachable={s['unreachable']:<4} failed={s['failures']}"
            )
            color = 'red' if (s['failures'] or s['unreachable']) else 'green'
            self._display.display(msg, color=color)

        if self._failure_count == 0:
            self._display.display(
                "\nAll tasks completed successfully (failures-only mode, ok/changed hidden)",
                color='green'
            )
```

## Table-Formatted Summary Callback

Display results in a clean table format:

```python
# callback_plugins/table_summary.py - Table-formatted output
from ansible.plugins.callback.default import CallbackModule as DefaultCallback


class CallbackModule(DefaultCallback):
    """Shows a table summary after the default output."""

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'table_summary'

    def __init__(self):
        super().__init__()
        self._host_task_results = {}

    def v2_runner_on_ok(self, result):
        super().v2_runner_on_ok(result)
        host = result._host.get_name()
        task = result._task.get_name()
        changed = result._result.get('changed', False)
        self._host_task_results.setdefault(host, []).append({
            'task': task,
            'status': 'changed' if changed else 'ok',
        })

    def v2_runner_on_failed(self, result, ignore_errors=False):
        super().v2_runner_on_failed(result, ignore_errors)
        host = result._host.get_name()
        task = result._task.get_name()
        self._host_task_results.setdefault(host, []).append({
            'task': task,
            'status': 'FAILED',
        })

    def v2_playbook_on_stats(self, stats):
        super().v2_playbook_on_stats(stats)

        # Print table summary
        self._display.display('')
        self._display.banner('TASK SUMMARY TABLE')

        # Header
        header = f"{'Host':<25} {'Task':<40} {'Status':<10}"
        self._display.display(header, color='bright blue')
        self._display.display('-' * 75)

        for host in sorted(self._host_task_results.keys()):
            for result in self._host_task_results[host]:
                status = result['status']
                if status == 'FAILED':
                    color = 'red'
                elif status == 'changed':
                    color = 'yellow'
                else:
                    color = 'green'

                line = f"{host:<25} {result['task'][:38]:<40} {status:<10}"
                self._display.display(line, color=color)
```

## Using Custom Callbacks

Place your callback in the `callback_plugins/` directory:

```
project/
  ansible.cfg
  callback_plugins/
    timestamped.py
    failures_only.py
    table_summary.py
  playbooks/
    site.yml
```

Enable in ansible.cfg:

```ini
# ansible.cfg
[defaults]
stdout_callback = timestamped
callback_plugins = ./callback_plugins
```

Switch between callbacks easily:

```bash
# Use the timestamped callback
ANSIBLE_STDOUT_CALLBACK=timestamped ansible-playbook site.yml

# Use failures-only for large runs
ANSIBLE_STDOUT_CALLBACK=failures_only ansible-playbook site.yml

# Use table summary for reviews
ANSIBLE_STDOUT_CALLBACK=table_summary ansible-playbook site.yml
```

## Extending the Default Callback

The easiest approach is to extend `DefaultCallback` and override specific methods. This way you keep all the default behavior and only change what you need:

```python
# callback_plugins/custom_default.py - Extend the default with minor tweaks
from ansible.plugins.callback.default import CallbackModule as DefaultCallback


class CallbackModule(DefaultCallback):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'custom_default'

    def v2_runner_on_ok(self, result):
        # Call the parent method for normal output
        super().v2_runner_on_ok(result)

        # Add custom behavior: warn if a task took too long
        if hasattr(result, '_task_fields'):
            duration = result._result.get('delta', '')
            if duration and self._parse_duration(duration) > 60:
                self._display.display(
                    f"  WARNING: Task took {duration}",
                    color='bright purple'
                )

    @staticmethod
    def _parse_duration(delta_str):
        """Parse a time delta string like '0:01:30.123456' to seconds."""
        try:
            parts = delta_str.split(':')
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        except (ValueError, IndexError):
            return 0
```

## Color Reference

The `_display.display()` method accepts these colors:

- `'green'` - success
- `'yellow'` - changed/warning
- `'red'` - failure
- `'cyan'` - informational
- `'bright blue'` - headers
- `'bright purple'` - special attention
- `'normal'` - default terminal color

Custom stdout callbacks give you full control over how Ansible communicates its results. Whether you need timestamps, filtered output, custom colors, or table formatting, the pattern is the same: extend `DefaultCallback` or `CallbackBase`, implement the event methods you care about, and display what matters to your workflow.
