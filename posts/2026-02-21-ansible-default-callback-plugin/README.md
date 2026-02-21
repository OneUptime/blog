# How to Use the Ansible default Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Output, Configuration

Description: Understand and configure the Ansible default callback plugin that controls standard playbook output formatting and verbosity levels.

---

The `default` callback plugin is what you see every time you run an Ansible playbook. It is the built-in stdout callback that formats task results, play recaps, and error messages into that familiar green/yellow/red output. Most people never think about it because it just works, but understanding how it operates and what you can configure gives you better control over your playbook output.

## What the Default Callback Does

Every time Ansible runs a task, the callback plugin receives events: playbook started, task started, host ok, host failed, host unreachable, play recap. The `default` callback formats these events into human-readable output. It is the reason you see lines like:

```
TASK [Install nginx] *********************************************************
ok: [web-01]
changed: [web-02]

PLAY RECAP *******************************************************************
web-01  : ok=5  changed=0  unreachable=0  failed=0  skipped=1  rescued=0  ignored=0
web-02  : ok=5  changed=2  unreachable=0  failed=0  skipped=1  rescued=0  ignored=0
```

This plugin is always active by default. You do not need to enable it. But you can configure its behavior through several settings.

## Configuration Options

The default callback has options you can set in `ansible.cfg` or as environment variables:

```ini
# ansible.cfg - Configure the default callback plugin
[defaults]
# Set the stdout callback (default is already 'default')
stdout_callback = default

# Show task execution time
callback_result_format = yaml

# Display skipped hosts
display_skipped_hosts = True

# Display ok hosts
display_ok_hosts = True

# Show custom stats in the recap
show_custom_stats = False
```

The environment variable equivalents:

```bash
# Environment variables for default callback configuration
export ANSIBLE_DISPLAY_SKIPPED_HOSTS=True
export ANSIBLE_DISPLAY_OK_HOSTS=True
export ANSIBLE_SHOW_CUSTOM_STATS=False
export ANSIBLE_CALLBACK_RESULT_FORMAT=yaml
```

## Controlling Verbosity

The default callback responds to Ansible's verbosity levels. Each `-v` flag reveals more detail:

```bash
# Normal output - task names and status
ansible-playbook site.yml

# -v shows task results
ansible-playbook site.yml -v

# -vv shows input parameters for tasks
ansible-playbook site.yml -vv

# -vvv shows connection details and more
ansible-playbook site.yml -vvv

# -vvvv shows full connection debugging
ansible-playbook site.yml -vvvv
```

At verbosity level 1 (`-v`), the default callback shows the return value of each task. For a `command` module, that means you see stdout and stderr. For a `file` module, you see the path and permissions that were set.

At level 2 (`-vv`), you get the actual module arguments that were sent, which is invaluable for debugging template rendering issues.

## Result Format: YAML vs JSON

By default, task results are displayed as Python dictionaries. You can switch to YAML or JSON format for better readability:

```ini
# ansible.cfg - Use YAML format for task results
[defaults]
callback_result_format = yaml
```

Compare the output difference. Default (Python dict) format:

```
ok: [web-01] => {"changed": false, "msg": "All items completed", "results": [{"changed": false, "item": "nginx"}]}
```

YAML format:

```
ok: [web-01] =>
  changed: false
  msg: All items completed
  results:
    - changed: false
      item: nginx
```

The YAML format is much easier to scan, especially when tasks return complex nested data.

## Hiding Skipped Tasks

If you have playbooks with many conditional tasks, the output can get noisy with skipped task messages. Turn them off:

```ini
# ansible.cfg - Suppress skipped host display
[defaults]
display_skipped_hosts = False
```

Here is a practical example. With `display_skipped_hosts = True` (the default):

```
TASK [Install apt packages] **************************************************
skipped: [db-01]
skipped: [db-02]
ok: [web-01]
ok: [web-02]

TASK [Install yum packages] **************************************************
ok: [db-01]
ok: [db-02]
skipped: [web-01]
skipped: [web-02]
```

With `display_skipped_hosts = False`:

```
TASK [Install apt packages] **************************************************
ok: [web-01]
ok: [web-02]

TASK [Install yum packages] **************************************************
ok: [db-01]
ok: [db-02]
```

Much cleaner when you have a large inventory with many different OS families.

## Custom Stats in the Recap

The default callback can show custom statistics if you set `show_custom_stats = True`. You populate these stats using the `set_stats` module in your playbooks:

```yaml
# custom-stats-example.yml - Demonstrate custom stats in the recap
---
- name: Deployment with custom stats
  hosts: webservers
  gather_facts: false

  tasks:
    - name: Deploy application
      copy:
        src: app.tar.gz
        dest: /opt/app/
      register: deploy_result

    # Track deployment stats
    - name: Record deployment stat
      set_stats:
        data:
          deployed_hosts: 1
        aggregate: true
      when: deploy_result.changed

    - name: Record skipped stat
      set_stats:
        data:
          already_current: 1
        aggregate: true
      when: not deploy_result.changed
```

Enable it in your config:

```ini
# ansible.cfg - Show custom stats in the play recap
[defaults]
show_custom_stats = True
```

The recap then includes your custom data:

```
PLAY RECAP *******************************************************************
web-01  : ok=3  changed=1  unreachable=0  failed=0
web-02  : ok=3  changed=1  unreachable=0  failed=0
web-03  : ok=3  changed=0  unreachable=0  failed=0

CUSTOM STATS: *****************************************************************
	RUN: { "already_current": 1, "deployed_hosts": 2 }
```

## Diff Mode Output

The default callback handles diff mode output when you run with `--diff`:

```bash
# Show what changed in files
ansible-playbook site.yml --diff
```

This produces output like:

```
TASK [Update nginx config] ***************************************************
--- before: /etc/nginx/nginx.conf
+++ after: /tmp/ansible_temp/nginx.conf
@@ -1,5 +1,5 @@
 worker_processes auto;
-worker_connections 768;
+worker_connections 1024;
```

Combine `--diff` with `--check` to preview changes without applying them:

```bash
# Preview changes in diff format without applying
ansible-playbook site.yml --check --diff
```

## When to Switch Away from Default

The default callback works well for interactive use and small to medium playbooks. Consider switching to a different stdout callback when:

- You need machine-parseable output (use `json`)
- Your playbooks are too verbose for dozens of hosts (use `dense` or `minimal`)
- You want to track performance (use `profile_tasks`)
- You are running in CI/CD and need structured output (use `junit` or `json`)

You can always come back to the default by setting:

```ini
[defaults]
stdout_callback = default
```

## Extending the Default Callback

If you want to customize the default callback without writing a completely new plugin, you can subclass it:

```python
# callback_plugins/my_default.py - Custom callback extending the default
from ansible.plugins.callback.default import CallbackModule as DefaultCallback

class CallbackModule(DefaultCallback):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'my_default'

    def v2_runner_on_ok(self, result):
        # Add timestamp to successful task output
        import datetime
        timestamp = datetime.datetime.now().strftime('%H:%M:%S')
        self._display.display(f"  [{timestamp}]", color='cyan')
        super().v2_runner_on_ok(result)
```

The default callback is deceptively simple. It handles the everyday case of "run a playbook and see what happened" well enough that most people never configure it. But tweaking a few settings, especially `display_skipped_hosts`, `callback_result_format`, and `show_custom_stats`, can significantly improve your day-to-day experience with Ansible output.
