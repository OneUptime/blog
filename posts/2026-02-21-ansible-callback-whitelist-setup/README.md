# How to Set Up Ansible Callback Whitelist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callbacks, Configuration, DevOps, Monitoring

Description: Configure the Ansible callback whitelist to enable timer, profiling, logging, and notification plugins for better playbook visibility.

---

Ansible callback plugins hook into playbook events and can do useful things like display task execution times, format output differently, send notifications, or log results to external systems. Most callback plugins are disabled by default and need to be explicitly enabled through the callback whitelist. This guide shows you which callback plugins are available, how to enable them, and practical configurations for common use cases.

## What is the Callback Whitelist?

The `callback_whitelist` setting in ansible.cfg specifies which callback plugins should be active during a playbook run. Only certain types of callbacks need whitelisting. There are two categories:

- **stdout callbacks**: Control how output is displayed. Only one can be active at a time, set via `stdout_callback`. These do not need to be whitelisted.
- **notification/aggregate callbacks**: Run alongside the stdout callback and perform additional actions. These must be whitelisted.

```ini
# ansible.cfg
[defaults]
# This sets the output format (only one at a time)
stdout_callback = yaml

# These additional callbacks run in parallel with stdout output
callback_whitelist = timer, profile_tasks, profile_roles
```

## Enabling the Callback Whitelist

### In ansible.cfg

```ini
# ansible.cfg
[defaults]
callback_whitelist = timer, profile_tasks, profile_roles, log_plays
```

### Via Environment Variable

```bash
# Enable callbacks via environment variable
export ANSIBLE_CALLBACK_WHITELIST=timer,profile_tasks
ansible-playbook deploy.yml
```

Note: In newer versions of Ansible (2.15+), the setting has been renamed to `callbacks_enabled`, but `callback_whitelist` still works as an alias:

```ini
# ansible.cfg - newer syntax
[defaults]
callbacks_enabled = timer, profile_tasks, profile_roles
```

## Essential Callback Plugins

### timer

Shows the total playbook execution time at the end of the run.

```ini
callback_whitelist = timer
```

Output:

```
PLAY RECAP *******************
web01 : ok=5    changed=2    unreachable=0    failed=0
web02 : ok=5    changed=2    unreachable=0    failed=0

Playbook run took 0 days, 0 hours, 2 minutes, 34 seconds
```

### profile_tasks

Shows how long each task took to execute. This is invaluable for identifying slow tasks and optimization opportunities.

```ini
callback_whitelist = profile_tasks
```

Output:

```
Wednesday 21 February 2026  10:30:00 +0000 (0:00:45.123)   0:02:34.567 *******
===============================================================================
Install packages ------------------------------------------- 45.12s
Restart nginx ---------------------------------------------- 12.34s
Copy configuration files ----------------------------------- 8.56s
Gathering Facts -------------------------------------------- 5.23s
Check service status --------------------------------------- 2.10s
```

### profile_roles

Shows execution time per role, which is useful for large playbooks with many roles.

```ini
callback_whitelist = profile_roles
```

Output:

```
===============================================================================
nginx -------------------------------------------------------- 65.45s
common ------------------------------------------------------- 32.12s
certbot ------------------------------------------------------ 18.90s
firewall ----------------------------------------------------- 8.34s
```

### log_plays

Logs task results to per-host files in `/var/log/ansible/hosts/`. Each host gets its own file with a timestamped record of every task that ran against it.

```ini
callback_whitelist = log_plays
```

### mail

Sends an email when a playbook finishes or when a task fails.

```ini
callback_whitelist = mail
```

Configure mail settings in ansible.cfg:

```ini
[callback_mail]
to = ops-team@example.com
sender = ansible@example.com
smtphost = smtp.example.com
smtpport = 587
```

### slack

Sends notifications to a Slack channel.

```ini
callback_whitelist = slack
```

Set the webhook URL:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

## Combining Multiple Callbacks

You can enable multiple callback plugins at once. Here is a practical production configuration:

```ini
# ansible.cfg - production configuration
[defaults]
# YAML output for readability
stdout_callback = yaml

# Enable timing, profiling, and logging
callback_whitelist = timer, profile_tasks, profile_roles, log_plays

# Custom callback plugins directory
callback_plugins = ./callback_plugins
```

And here is a CI/CD-focused configuration:

```ini
# ansible.cfg - CI/CD configuration
[defaults]
# JSON output for machine parsing
stdout_callback = json

# Enable timing for performance tracking
callback_whitelist = timer, profile_tasks
```

## Listing Available Callback Plugins

To see all callback plugins available on your system:

```bash
# List all callback plugins with descriptions
ansible-doc -t callback -l
```

To get detailed documentation for a specific callback:

```bash
# Get detailed info about the profile_tasks callback
ansible-doc -t callback profile_tasks
```

Typical output of the list command includes plugins like:

```
ansible.builtin.default     Default output
ansible.builtin.json        JSON output
ansible.builtin.log_plays   Log playbook results per host
ansible.builtin.minimal     Minimal output
ansible.builtin.profile_roles  Profile role execution times
ansible.builtin.profile_tasks  Profile task execution times
ansible.builtin.timer       Show playbook run duration
ansible.builtin.yaml        YAML output
community.general.slack     Send notifications to Slack
community.general.logstash  Send logs to Logstash
```

## Custom Callback Plugin Example

If the built-in callbacks do not meet your needs, write your own. Here is a practical example that writes a summary JSON file after each playbook run:

```python
# callback_plugins/run_summary.py

import json
import os
import time
from datetime import datetime
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    """Write a JSON summary file after each playbook run."""
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    CALLBACK_NAME = 'run_summary'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super().__init__()
        self.start_time = None
        self.task_results = {
            'ok': 0,
            'changed': 0,
            'failed': 0,
            'skipped': 0,
            'unreachable': 0,
        }
        self.failed_tasks = []

    def v2_playbook_on_start(self, playbook):
        self.start_time = time.time()
        self.playbook_name = os.path.basename(playbook._file_name)

    def v2_runner_on_ok(self, result):
        if result._result.get('changed', False):
            self.task_results['changed'] += 1
        else:
            self.task_results['ok'] += 1

    def v2_runner_on_failed(self, result, ignore_errors=False):
        self.task_results['failed'] += 1
        self.failed_tasks.append({
            'host': result._host.get_name(),
            'task': result._task.get_name(),
            'msg': result._result.get('msg', 'unknown error'),
        })

    def v2_runner_on_skipped(self, result):
        self.task_results['skipped'] += 1

    def v2_runner_on_unreachable(self, result):
        self.task_results['unreachable'] += 1

    def v2_playbook_on_stats(self, stats):
        duration = time.time() - self.start_time if self.start_time else 0

        summary = {
            'playbook': self.playbook_name,
            'timestamp': datetime.utcnow().isoformat(),
            'duration_seconds': round(duration, 2),
            'results': self.task_results,
            'failed_tasks': self.failed_tasks,
            'success': self.task_results['failed'] == 0 and self.task_results['unreachable'] == 0,
        }

        summary_dir = 'logs/summaries'
        os.makedirs(summary_dir, exist_ok=True)

        filename = "run-{}.json".format(datetime.utcnow().strftime('%Y%m%d-%H%M%S'))
        filepath = os.path.join(summary_dir, filename)

        with open(filepath, 'w') as f:
            json.dump(summary, f, indent=2)

        self._display.display("Run summary written to: {}".format(filepath))
```

Enable it:

```ini
# ansible.cfg
[defaults]
callback_whitelist = run_summary, timer, profile_tasks
callback_plugins = ./callback_plugins
```

## Troubleshooting Callback Issues

**Callback not running**

Make sure the plugin name is spelled correctly in the whitelist and that the plugin type supports whitelisting. Stdout callbacks should be set with `stdout_callback`, not `callback_whitelist`.

**"callback plugin not found"**

If you are using a community callback, install the required collection first:

```bash
# Install community.general for Slack, Logstash, and other callbacks
ansible-galaxy collection install community.general
```

**Custom callback not loading**

Verify the `callback_plugins` path in ansible.cfg points to the directory containing your plugin file. Use verbose mode to debug:

```bash
ansible-playbook -vvvv deploy.yml 2>&1 | grep -i callback
```

## Summary

The callback whitelist is how you unlock Ansible's observability features. At minimum, enable `timer` and `profile_tasks` for every project so you always know how long things take. Add `log_plays` for audit trails, and consider notification callbacks (Slack, email) for production deployments. For more advanced use cases, writing custom callback plugins is straightforward and gives you complete control over how playbook events are processed and reported.
