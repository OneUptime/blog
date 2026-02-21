# How to Use Ansible Callback Plugins for Better Error Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Debugging, Logging

Description: Learn how to use Ansible callback plugins to customize output formatting, improve error visibility, and integrate with external logging systems.

---

The default Ansible output is functional but not always easy to parse, especially when you are dealing with failures across many hosts. Callback plugins let you change how Ansible displays task results, errors, and summaries. Some plugins make output more readable, others make it more compact, and some send results to external systems like Slack or Elasticsearch. This post walks through the most useful callback plugins and how to configure them.

## What Are Callback Plugins?

Callback plugins are hooks into Ansible's execution lifecycle. They get called at specific events: when a play starts, when a task completes, when a host fails, and so on. The "stdout" callback plugin controls what you see in the terminal, while "notification" callback plugins can send data elsewhere without changing terminal output.

## Listing Available Callback Plugins

To see what callback plugins are available on your system:

```bash
# List all callback plugins
ansible-doc -t callback -l

# Get details about a specific plugin
ansible-doc -t callback yaml
```

Common built-in plugins include:

- `default` - the standard output you are used to
- `yaml` - YAML-formatted output (much more readable)
- `json` - machine-parseable JSON output
- `dense` - minimal, one-line-per-task output
- `minimal` - bare minimum output
- `debug` - shows stdout/stderr on failed tasks
- `timer` - adds timing information
- `profile_tasks` - shows per-task timing

## Changing the stdout Callback Plugin

### Method 1: ansible.cfg

```ini
# ansible.cfg
[defaults]
# Change the default output format
stdout_callback = yaml
```

### Method 2: Environment Variable

```bash
# Set for a single run
ANSIBLE_STDOUT_CALLBACK=yaml ansible-playbook deploy.yml

# Or export for the session
export ANSIBLE_STDOUT_CALLBACK=yaml
ansible-playbook deploy.yml
```

## The yaml Callback Plugin

This is my recommended default. It formats output as YAML instead of JSON, making it significantly more readable:

```ini
# ansible.cfg
[defaults]
stdout_callback = yaml
```

Default output (hard to read):

```
ok: [web-01] => {"ansible_facts": {"ansible_distribution": "Ubuntu", "ansible_distribution_version": "22.04"}, "changed": false}
```

YAML callback output (much better):

```
ok: [web-01] =>
  ansible_facts:
    ansible_distribution: Ubuntu
    ansible_distribution_version: '22.04'
  changed: false
```

## The debug Callback Plugin

The debug callback plugin is specifically designed for troubleshooting. It shows stdout and stderr prominently on failed tasks:

```ini
# ansible.cfg
[defaults]
stdout_callback = debug
```

When a task fails, the output looks like:

```
TASK [Run database migration] *************************************************
FAILED - RETRYING: Run database migration (3 retries left).

STDOUT:
Starting migration from v2.3 to v2.4
Processing table: users... done
Processing table: orders... ERROR

STDERR:
ERROR: Column 'status' cannot be converted from VARCHAR to INTEGER
Migration failed at step 3 of 7

MSG:
non-zero return code

FAILED - web-01
```

This is much more useful than the default output, which stuffs everything into a single JSON blob.

## Enabling Multiple Callback Plugins

You can have one stdout callback and multiple notification callbacks active simultaneously:

```ini
# ansible.cfg
[defaults]
# The main output format
stdout_callback = yaml

# Enable additional (non-stdout) callback plugins
callbacks_enabled = timer, profile_tasks, profile_roles
```

## The timer Callback Plugin

Adds total playbook execution time to the output:

```ini
# ansible.cfg
[defaults]
callbacks_enabled = timer
```

Output at the end of the run:

```
PLAY RECAP ********************************************************************
web-01  : ok=15   changed=3    unreachable=0    failed=0    skipped=2

Playbook run took 0 days, 0 hours, 2 minutes, 34 seconds
```

## The profile_tasks Callback Plugin

Shows how long each task took, sorted by duration:

```ini
# ansible.cfg
[defaults]
callbacks_enabled = profile_tasks
```

Output:

```
PLAY RECAP ********************************************************************

Wednesday 21 February 2026  10:15:00 +0000 (0:00:01.234) 0:02:34.567 *********
===============================================================================
Install application packages ------------------------------------------ 45.23s
Download release artifact --------------------------------------------- 32.11s
Run database migration ------------------------------------------------ 28.45s
Deploy nginx configuration -------------------------------------------- 2.34s
Restart application --------------------------------------------------- 1.89s
Create application directory ------------------------------------------ 0.45s
```

This is incredibly useful for identifying slow tasks that could be optimized.

## The json Callback Plugin

Outputs everything as JSON, which is perfect for piping to other tools:

```bash
# Get JSON output for programmatic processing
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook deploy.yml > results.json
```

The JSON output structure:

```json
{
    "plays": [
        {
            "play": {
                "name": "Deploy application",
                "id": "abc-123"
            },
            "tasks": [
                {
                    "task": {
                        "name": "Install packages"
                    },
                    "hosts": {
                        "web-01": {
                            "changed": true,
                            "msg": "..."
                        }
                    }
                }
            ]
        }
    ],
    "stats": {
        "web-01": {
            "changed": 3,
            "failures": 0,
            "ok": 15,
            "skipped": 2,
            "unreachable": 0
        }
    }
}
```

## Writing a Custom Callback Plugin

You can write your own callback plugin for specific needs. Here is a simple one that sends failure notifications to a webhook:

```python
# callback_plugins/failure_webhook.py
from ansible.plugins.callback import CallbackBase
import json
import urllib.request

DOCUMENTATION = '''
    name: failure_webhook
    type: notification
    short_description: Send task failures to a webhook
    description:
        - Posts task failure details to a configured webhook URL
    options:
        webhook_url:
            description: URL to post failure notifications to
            env:
                - name: ANSIBLE_FAILURE_WEBHOOK_URL
            ini:
                - section: callback_failure_webhook
                  key: webhook_url
'''

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'failure_webhook'
    CALLBACK_NEEDS_ENABLED = True

    def __init__(self):
        super(CallbackModule, self).__init__()
        self.webhook_url = None

    def set_options(self, task_keys=None, var_options=None, direct=None):
        super(CallbackModule, self).set_options(
            task_keys=task_keys, var_options=var_options, direct=direct
        )
        self.webhook_url = self.get_option('webhook_url')

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if ignore_errors:
            return

        if not self.webhook_url:
            return

        payload = {
            'host': result._host.get_name(),
            'task': result._task.get_name(),
            'message': result._result.get('msg', 'Unknown error'),
            'stdout': result._result.get('stdout', ''),
            'stderr': result._result.get('stderr', ''),
        }

        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            self.webhook_url,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            self._display.warning(f"Failed to send webhook: {e}")
```

Enable it in ansible.cfg:

```ini
# ansible.cfg
[defaults]
callbacks_enabled = failure_webhook
callback_plugins = ./callback_plugins

[callback_failure_webhook]
webhook_url = https://hooks.example.com/ansible-failures
```

## Practical Configuration for Different Environments

### Development Environment

```ini
# ansible.cfg for development
[defaults]
stdout_callback = yaml
callbacks_enabled = timer, profile_tasks
display_skipped_hosts = true
display_ok_hosts = true

# Show full diff output
diff = true
```

### CI/CD Pipeline

```ini
# ansible.cfg for CI/CD
[defaults]
stdout_callback = yaml
callbacks_enabled = timer, profile_tasks, junit
# JUnit callback creates XML files that CI tools can parse

[callback_junit]
output_dir = ./test-results/
```

### Production Operations

```ini
# ansible.cfg for production
[defaults]
stdout_callback = yaml
callbacks_enabled = timer, profile_tasks, failure_webhook

# Reduce noise
display_skipped_hosts = false
display_ok_hosts = true
```

## Useful Third-Party Callback Plugins

Several popular callback plugins are available through Ansible collections:

```bash
# Install community.general for additional callbacks
ansible-galaxy collection install community.general
```

Notable options:
- `community.general.say` - text-to-speech on macOS (fun for demos)
- `community.general.slack` - sends notifications to Slack
- `community.general.logstash` - sends results to Logstash/ELK
- `community.general.grafana_annotations` - creates Grafana annotations during deployments

## Combining Plugins for Maximum Visibility

My recommended setup for most teams:

```ini
# ansible.cfg
[defaults]
stdout_callback = yaml
callbacks_enabled = timer, profile_tasks

# Also useful settings that affect output
show_task_path_on_failure = true
display_skipped_hosts = false
any_errors_fatal = false
```

This gives you readable YAML output, total run time, per-task timing, and shows the file path when a task fails. Skipped hosts are hidden to reduce noise.

## Summary

Callback plugins are one of Ansible's most underused features. Start by switching your stdout callback to `yaml` for immediate readability improvements. Add `timer` and `profile_tasks` for performance visibility. Use the `json` callback in CI/CD pipelines for programmatic processing. For team workflows, consider notification callbacks that post to Slack or monitoring systems. The right combination of callbacks transforms Ansible output from a wall of JSON into actionable, readable information.
