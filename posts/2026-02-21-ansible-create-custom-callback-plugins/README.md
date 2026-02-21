# How to Create Custom Ansible Callback Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Python, Plugin Development

Description: Build custom Ansible callback plugins from scratch to control output formatting, send notifications, and integrate with external monitoring systems.

---

Ansible's built-in callback plugins cover common needs, but sometimes you need something specific: posting to a custom dashboard, logging to a particular format, or integrating with an internal notification system. Writing a custom callback plugin is straightforward once you understand the event model and the class structure.

## Callback Plugin Basics

A callback plugin is a Python class that inherits from `CallbackBase` and implements methods for specific events. Ansible fires events at key points during execution: playbook start, task start, host success, host failure, and so on. Your callback receives these events and does whatever you want with them.

There are two types of callbacks:

- **stdout** callbacks replace the default terminal output (only one active at a time)
- **notification** callbacks run alongside the stdout callback (multiple can be active)

## Minimal Callback Plugin

Here is the simplest possible callback plugin:

```python
# callback_plugins/my_callback.py - A minimal notification callback
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    """A minimal custom callback plugin."""

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'  # or 'stdout' for output callbacks
    CALLBACK_NAME = 'my_callback'
    CALLBACK_NEEDS_WHITELIST = True  # Require explicit enable in ansible.cfg

    def v2_playbook_on_stats(self, stats):
        """Called at the end of the playbook with summary statistics."""
        hosts = sorted(stats.processed.keys())
        for h in hosts:
            summary = stats.summarize(h)
            if summary['failures'] > 0:
                self._display.display(
                    f"CUSTOM: Host {h} had {summary['failures']} failures",
                    color='red'
                )
```

Place this file in your project's `callback_plugins/` directory and enable it:

```ini
# ansible.cfg
[defaults]
callback_whitelist = my_callback
callback_plugins = ./callback_plugins
```

## Available Event Methods

Here are the most commonly used callback methods:

```python
# callback_plugins/event_reference.py - Reference of all major callback events
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'event_reference'
    CALLBACK_NEEDS_WHITELIST = True

    # Playbook lifecycle events
    def v2_playbook_on_start(self, playbook):
        """Fired when the playbook begins."""
        self._display.display(f"Playbook starting: {playbook._file_name}")

    def v2_playbook_on_play_start(self, play):
        """Fired when a new play begins."""
        name = play.get_name().strip()
        self._display.display(f"Play starting: {name}")

    def v2_playbook_on_task_start(self, task, is_conditional):
        """Fired when a new task begins."""
        self._display.display(f"Task starting: {task.get_name()}")

    # Host result events
    def v2_runner_on_ok(self, result):
        """Fired when a task succeeds on a host."""
        host = result._host.get_name()
        changed = result._result.get('changed', False)
        self._display.display(f"OK: {host} (changed={changed})")

    def v2_runner_on_failed(self, result, ignore_errors=False):
        """Fired when a task fails on a host."""
        host = result._host.get_name()
        msg = result._result.get('msg', 'No error message')
        self._display.display(f"FAILED: {host} - {msg}")

    def v2_runner_on_skipped(self, result):
        """Fired when a task is skipped on a host."""
        host = result._host.get_name()
        self._display.display(f"SKIPPED: {host}")

    def v2_runner_on_unreachable(self, result):
        """Fired when a host is unreachable."""
        host = result._host.get_name()
        self._display.display(f"UNREACHABLE: {host}")

    # Summary event
    def v2_playbook_on_stats(self, stats):
        """Fired at the very end with summary statistics."""
        for host in sorted(stats.processed.keys()):
            summary = stats.summarize(host)
            self._display.display(
                f"RECAP: {host} - ok={summary['ok']} "
                f"changed={summary['changed']} "
                f"failed={summary['failures']}"
            )
```

## Building a Webhook Notification Callback

Here is a practical callback that posts results to a webhook endpoint:

```python
# callback_plugins/webhook_notify.py - Post playbook results to a webhook
import json
import os
from datetime import datetime

from ansible.plugins.callback import CallbackBase

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class CallbackModule(CallbackBase):
    """Posts playbook results to a webhook URL."""

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'webhook_notify'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super().__init__()
        self.webhook_url = os.environ.get('ANSIBLE_WEBHOOK_URL', '')
        self.playbook_name = ''
        self.start_time = None
        self.task_results = []
        self.failed_tasks = []

        if not HAS_REQUESTS:
            self._display.warning(
                'webhook_notify callback requires the requests library'
            )

    def v2_playbook_on_start(self, playbook):
        self.playbook_name = playbook._file_name
        self.start_time = datetime.now()

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if not ignore_errors:
            self.failed_tasks.append({
                'host': result._host.get_name(),
                'task': result._task.get_name(),
                'message': result._result.get('msg', ''),
            })

    def v2_playbook_on_stats(self, stats):
        """Send the final summary to the webhook."""
        if not self.webhook_url or not HAS_REQUESTS:
            return

        duration = (datetime.now() - self.start_time).total_seconds()

        # Build the payload
        host_results = {}
        for host in sorted(stats.processed.keys()):
            summary = stats.summarize(host)
            host_results[host] = {
                'ok': summary['ok'],
                'changed': summary['changed'],
                'failures': summary['failures'],
                'unreachable': summary['unreachable'],
                'skipped': summary['skipped'],
            }

        payload = {
            'playbook': self.playbook_name,
            'timestamp': self.start_time.isoformat(),
            'duration_seconds': duration,
            'status': 'failed' if self.failed_tasks else 'success',
            'hosts': host_results,
            'failures': self.failed_tasks,
        }

        try:
            requests.post(
                self.webhook_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10,
            )
        except requests.RequestException as e:
            self._display.warning(f"webhook_notify: Failed to post: {e}")
```

Enable and use it:

```bash
# Set the webhook URL and run
export ANSIBLE_WEBHOOK_URL=https://hooks.example.com/ansible
export ANSIBLE_CALLBACK_WHITELIST=webhook_notify
ansible-playbook deploy.yml
```

## Building a Custom stdout Callback

A stdout callback replaces the default output entirely. Here is one that shows a progress bar:

```python
# callback_plugins/progress.py - Progress bar stdout callback
import sys
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    """Shows a progress bar for playbook execution."""

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'progress'

    def __init__(self):
        super().__init__()
        self.total_tasks = 0
        self.completed_tasks = 0
        self.current_play = ''
        self.failures = []

    def v2_playbook_on_play_start(self, play):
        self.current_play = play.get_name().strip()
        self._display.banner(f"PLAY [{self.current_play}]")

    def v2_playbook_on_task_start(self, task, is_conditional):
        self.total_tasks += 1

    def _show_progress(self, host, status, color):
        self.completed_tasks += 1
        bar_length = 40
        filled = int(bar_length * self.completed_tasks / max(self.total_tasks, 1))
        bar = '#' * filled + '-' * (bar_length - filled)
        sys.stdout.write(f"\r  [{bar}] {host}: {status}    ")
        sys.stdout.flush()

    def v2_runner_on_ok(self, result):
        status = 'changed' if result._result.get('changed') else 'ok'
        color = 'yellow' if status == 'changed' else 'green'
        self._show_progress(result._host.get_name(), status, color)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        host = result._host.get_name()
        self.failures.append({
            'host': host,
            'task': result._task.get_name(),
            'msg': result._result.get('msg', ''),
        })
        self._show_progress(host, 'FAILED', 'red')

    def v2_runner_on_unreachable(self, result):
        self._show_progress(result._host.get_name(), 'UNREACHABLE', 'red')

    def v2_playbook_on_stats(self, stats):
        # Final newline after progress bar
        self._display.display('')
        self._display.banner('PLAY RECAP')

        for host in sorted(stats.processed.keys()):
            s = stats.summarize(host)
            msg = (
                f"{host:<30} ok={s['ok']:<4} changed={s['changed']:<4} "
                f"failed={s['failures']:<4} unreachable={s['unreachable']}"
            )
            self._display.display(msg)

        if self.failures:
            self._display.display('\nFAILURES:', color='red')
            for f in self.failures:
                self._display.display(
                    f"  {f['host']} / {f['task']}: {f['msg']}",
                    color='red'
                )
```

## Plugin Configuration with DOCUMENTATION

For plugins that accept configuration, add a DOCUMENTATION string:

```python
# callback_plugins/configurable_example.py
DOCUMENTATION = '''
    name: configurable_example
    type: notification
    short_description: Example with configuration
    description:
        - An example callback with configurable options
    options:
        api_url:
            description: URL to send results to
            env:
                - name: ANSIBLE_EXAMPLE_API_URL
            ini:
                - section: callback_configurable_example
                  key: api_url
            required: true
        api_token:
            description: Authentication token
            env:
                - name: ANSIBLE_EXAMPLE_API_TOKEN
            ini:
                - section: callback_configurable_example
                  key: api_token
'''

from ansible.plugins.callback import CallbackBase

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'configurable_example'
    CALLBACK_NEEDS_WHITELIST = True

    def set_options(self, task_keys=None, var_options=None, direct=None):
        super().set_options(task_keys=task_keys, var_options=var_options, direct=direct)
        self.api_url = self.get_option('api_url')
        self.api_token = self.get_option('api_token')
```

## Testing Your Callback

Test with a simple playbook:

```yaml
# test-callback.yml
---
- name: Test custom callback
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - debug:
        msg: "Testing callback"
    - command: /bin/true
    - command: /bin/false
      ignore_errors: true
```

```bash
ANSIBLE_CALLBACK_WHITELIST=my_callback ansible-playbook test-callback.yml
```

Writing custom callbacks opens up Ansible to integrate with any system you use. The event model is simple, the Python is straightforward, and the payoff is worth the effort.
