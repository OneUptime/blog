# How to Log Ansible Errors to a File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Logging, Error Handling, Debugging

Description: Learn multiple approaches for logging Ansible errors and output to files for debugging and audit purposes in production environments.

---

When Ansible playbooks fail in production, you need logs. Console output scrolls away, CI/CD systems may truncate output, and your on-call engineer needs to see exactly what happened. Ansible provides several ways to capture output to files, from simple log file configuration to callback plugins and custom error handlers.

## The Simple Approach: log_path in ansible.cfg

The quickest way to log all Ansible output to a file is the `log_path` setting.

```ini
# ansible.cfg - Enable file logging
[defaults]
log_path = /var/log/ansible/ansible.log

# Make sure the directory exists and the running user has write access
# mkdir -p /var/log/ansible
# chmod 755 /var/log/ansible
```

This logs everything that Ansible outputs to the console. It is comprehensive but can produce large files and does not distinguish between errors and normal output.

You can also set this with an environment variable:

```bash
# Set log path via environment variable
export ANSIBLE_LOG_PATH=/var/log/ansible/deploy-$(date +%Y%m%d-%H%M%S).log
ansible-playbook deploy.yml
```

Using a timestamp in the filename ensures each run gets its own log file:

```bash
# Wrapper script that creates timestamped log files
#!/bin/bash
# run-ansible.sh - Run playbook with timestamped logging
PLAYBOOK=$1
shift

LOG_DIR=/var/log/ansible
LOG_FILE="${LOG_DIR}/$(basename ${PLAYBOOK%.yml})-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"

ANSIBLE_LOG_PATH="$LOG_FILE" ansible-playbook "$PLAYBOOK" "$@"
EXIT_CODE=$?

echo "Log saved to: $LOG_FILE"

# If there were failures, extract error lines into a separate file
if [ $EXIT_CODE -ne 0 ]; then
    grep -E "(FAILED|fatal|ERROR)" "$LOG_FILE" > "${LOG_FILE%.log}.errors.log"
    echo "Errors saved to: ${LOG_FILE%.log}.errors.log"
fi

exit $EXIT_CODE
```

## Using the no_log and register Pattern for Error Capture

For targeted error logging, you can register task results and write errors to a file using the `copy` or `lineinfile` module.

```yaml
# error-logging.yml - Capture and log specific task errors
---
- name: Deploy with error logging
  hosts: webservers
  vars:
    error_log: /var/log/ansible/deploy-errors.log
  tasks:
    - name: Ensure error log directory exists
      ansible.builtin.file:
        path: "{{ error_log | dirname }}"
        state: directory
        mode: '0755'
      delegate_to: localhost
      run_once: true

    - name: Initialize error log with run metadata
      ansible.builtin.copy:
        content: |
          === Deployment Run: {{ ansible_date_time.iso8601 }} ===
          Playbook: deploy-with-logging.yml
          Hosts: {{ ansible_play_hosts | join(', ') }}
          ===
        dest: "{{ error_log }}"
      delegate_to: localhost
      run_once: true

    - name: Attempt package installation
      ansible.builtin.apt:
        name: nginx
        state: present
      become: true
      register: pkg_result
      ignore_errors: true

    - name: Log package installation failure
      ansible.builtin.lineinfile:
        path: "{{ error_log }}"
        line: "FAILED [{{ inventory_hostname }}] Package install: {{ pkg_result.msg | default('unknown error') }}"
        create: true
      delegate_to: localhost
      when: pkg_result is failed

    - name: Attempt service start
      ansible.builtin.systemd:
        name: nginx
        state: started
      become: true
      register: svc_result
      ignore_errors: true

    - name: Log service start failure
      ansible.builtin.lineinfile:
        path: "{{ error_log }}"
        line: "FAILED [{{ inventory_hostname }}] Service start: {{ svc_result.msg | default('unknown error') }}"
        create: true
      delegate_to: localhost
      when: svc_result is failed
```

## Using Block/Rescue for Error Collection

A cleaner approach is to use `block` and `rescue` to capture errors without cluttering your playbook with `ignore_errors` on every task.

```yaml
# block-error-logging.yml - Using block/rescue for clean error capture
---
- name: Deploy with block-level error logging
  hosts: appservers
  vars:
    error_log: /var/log/ansible/deploy-errors.json
  tasks:
    - name: Deployment tasks
      block:
        - name: Stop application
          ansible.builtin.systemd:
            name: myapp
            state: stopped
          become: true

        - name: Deploy new code
          ansible.builtin.git:
            repo: https://github.com/myorg/myapp.git
            dest: /opt/myapp
            version: "{{ app_version }}"

        - name: Install dependencies
          ansible.builtin.pip:
            requirements: /opt/myapp/requirements.txt
            virtualenv: /opt/myapp/venv

        - name: Start application
          ansible.builtin.systemd:
            name: myapp
            state: started
          become: true

      rescue:
        - name: Capture error details
          ansible.builtin.set_fact:
            error_details:
              host: "{{ inventory_hostname }}"
              timestamp: "{{ now(utc=true).isoformat() }}"
              failed_task: "{{ ansible_failed_task.name }}"
              error_message: "{{ ansible_failed_result.msg | default('No message') }}"
              error_result: "{{ ansible_failed_result | to_nice_json }}"

        - name: Write error to log file
          ansible.builtin.copy:
            content: "{{ error_details | to_nice_json }}\n"
            dest: "{{ error_log }}.{{ inventory_hostname }}"
          delegate_to: localhost

        - name: Fail the host after logging
          ansible.builtin.fail:
            msg: "Deployment failed on {{ inventory_hostname }}. See {{ error_log }}.{{ inventory_hostname }}"
```

## Custom Callback Plugin for Error Logging

For the most flexible error logging, you can write a callback plugin. This captures errors globally without modifying your playbooks.

Create the callback plugin:

```python
# callback_plugins/error_logger.py - Custom callback that logs errors to a file
from datetime import datetime
import json
import os
from ansible.plugins.callback import CallbackBase

DOCUMENTATION = '''
    name: error_logger
    type: notification
    short_description: Logs task failures to a JSON file
    description:
        - Writes a JSON log entry for every failed task
    options:
        error_log_path:
            description: Path to the error log file
            default: /var/log/ansible/errors.jsonl
            env:
                - name: ANSIBLE_ERROR_LOG_PATH
'''

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'error_logger'
    CALLBACK_NEEDS_ENABLED = True

    def __init__(self):
        super().__init__()
        self.log_path = os.environ.get(
            'ANSIBLE_ERROR_LOG_PATH',
            '/var/log/ansible/errors.jsonl'
        )
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

    def _log_error(self, result, status):
        """Write a structured error entry to the log file."""
        host = result._host.get_name()
        task = result._task.get_name()

        entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'host': host,
            'task': task,
            'status': status,
            'message': result._result.get('msg', ''),
            'stderr': result._result.get('stderr', ''),
            'stdout': result._result.get('stdout', ''),
            'rc': result._result.get('rc', None),
        }

        with open(self.log_path, 'a') as f:
            f.write(json.dumps(entry) + '\n')

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if not ignore_errors:
            self._log_error(result, 'FAILED')

    def v2_runner_on_unreachable(self, result):
        self._log_error(result, 'UNREACHABLE')
```

Enable it in `ansible.cfg`:

```ini
# ansible.cfg - Enable the custom error logging callback
[defaults]
callback_plugins = ./callback_plugins
callbacks_enabled = error_logger
```

The plugin writes JSONL (one JSON object per line), which is easy to parse and query:

```bash
# View recent errors
tail -5 /var/log/ansible/errors.jsonl | python3 -m json.tool

# Count errors by host
cat /var/log/ansible/errors.jsonl | python3 -c "
import sys, json
from collections import Counter
hosts = Counter()
for line in sys.stdin:
    entry = json.loads(line)
    hosts[entry['host']] += 1
for host, count in hosts.most_common():
    print(f'{host}: {count} errors')
"

# Find all errors from today
grep "$(date +%Y-%m-%d)" /var/log/ansible/errors.jsonl | python3 -m json.tool
```

## Redirecting Output with tee

The simplest approach that requires no configuration changes is redirecting output with `tee`:

```bash
# Capture full output while still seeing it on screen
ansible-playbook deploy.yml 2>&1 | tee /var/log/ansible/deploy-$(date +%Y%m%d%H%M%S).log

# Capture only errors (stderr)
ansible-playbook deploy.yml 2> /var/log/ansible/deploy-errors.log

# Capture everything with color codes stripped
ansible-playbook deploy.yml 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee /var/log/ansible/deploy.log
```

## Log Rotation

When you are writing logs to files regularly, you need rotation to prevent disk space issues.

```
# /etc/logrotate.d/ansible - Logrotate configuration for Ansible logs
/var/log/ansible/*.log /var/log/ansible/*.jsonl {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

## Summary

Logging Ansible errors to files can be as simple as setting `log_path` in `ansible.cfg` or as sophisticated as writing a custom callback plugin. For most teams, I recommend a layered approach: use `log_path` or `tee` for full output capture, a callback plugin for structured error logging, and `block`/`rescue` for application-specific error handling. Store logs in a consistent location, use timestamps in filenames, and set up log rotation. When something breaks at 2 AM, the on-call engineer will thank you for the detailed error logs.
