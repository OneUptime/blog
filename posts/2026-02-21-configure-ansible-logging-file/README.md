# How to Configure Ansible Logging to a File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Logging, Monitoring, DevOps

Description: Set up Ansible to log all playbook output to a file for auditing, debugging, and compliance, with rotation and filtering strategies.

---

By default, Ansible only outputs to the terminal. When a playbook finishes, the output is gone unless you scrolled up or piped it to a file manually. For production environments, CI/CD pipelines, and audit compliance, you need persistent logs. Ansible has a built-in logging feature that writes all output to a file, and with a bit of configuration, you can set up log rotation, filtering, and structured logging.

## Enabling Basic File Logging

The simplest way to enable logging is to set `log_path` in your ansible.cfg:

```ini
# ansible.cfg
[defaults]
log_path = /var/log/ansible/ansible.log
```

Make sure the directory exists and the user running Ansible has write permissions:

```bash
# Create the log directory
sudo mkdir -p /var/log/ansible

# Set ownership to the user that runs Ansible
sudo chown $(whoami):$(whoami) /var/log/ansible

# Set permissions
chmod 750 /var/log/ansible
```

Alternatively, you can set logging via an environment variable:

```bash
# Enable logging via environment variable
export ANSIBLE_LOG_PATH=/var/log/ansible/ansible.log
ansible-playbook deploy.yml
```

## Per-Project Log Files

For project-specific logging, use a relative path in your project's ansible.cfg:

```ini
# ansible.cfg (in project root)
[defaults]
log_path = ./logs/ansible.log
```

Create the directory:

```bash
# Create the logs directory in your project
mkdir -p logs

# Add to .gitignore so logs don't get committed
echo "logs/" >> .gitignore
```

This way, each project maintains its own log history.

## What Gets Logged

Ansible's file logging captures everything that appears in the terminal output, including:

- Playbook start and end timestamps
- Task names and their results (ok, changed, failed, skipped)
- Host-level output
- Error messages and tracebacks
- Handler execution

The log format looks like this:

```
2026-02-21 10:15:30,123 p=12345 u=deploy n=ansible | PLAY [Deploy web application] *****
2026-02-21 10:15:30,456 p=12345 u=deploy n=ansible | TASK [Gathering Facts] *****
2026-02-21 10:15:32,789 p=12345 u=deploy n=ansible | ok: [web01]
2026-02-21 10:15:33,012 p=12345 u=deploy n=ansible | ok: [web02]
2026-02-21 10:15:33,345 p=12345 u=deploy n=ansible | TASK [Install packages] *****
2026-02-21 10:15:40,678 p=12345 u=deploy n=ansible | changed: [web01]
2026-02-21 10:15:41,234 p=12345 u=deploy n=ansible | changed: [web02]
```

Each line includes a timestamp, process ID, username, and the actual log message.

## Setting Up Log Rotation

Without rotation, the log file will grow indefinitely. Set up logrotate to manage it:

```bash
# Create a logrotate configuration for Ansible logs
sudo tee /etc/logrotate.d/ansible << 'EOF'
/var/log/ansible/ansible.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 deploy deploy
    dateext
    dateformat -%Y%m%d
}
EOF
```

This configuration:
- Rotates the log daily
- Keeps 30 days of history
- Compresses old logs (except the most recent rotation)
- Does not fail if the log file is missing
- Skips rotation if the file is empty
- Adds the date to rotated file names

Test the logrotate configuration:

```bash
# Dry run to see what logrotate would do
sudo logrotate -d /etc/logrotate.d/ansible
```

## JSON Logging with a Callback Plugin

The default log format is plain text, which is hard to parse programmatically. For structured logging, use the `json` callback plugin:

```ini
# ansible.cfg
[defaults]
log_path = /var/log/ansible/ansible.log
stdout_callback = json
```

Or use the `log_plays` callback plugin, which is specifically designed for file logging:

```ini
# ansible.cfg
[defaults]
callback_whitelist = log_plays

# The log_plays callback writes to /var/log/ansible/hosts/ by default
# Each host gets its own log file
```

The `log_plays` callback creates per-host log files in `/var/log/ansible/hosts/`, which makes it easy to track what happened on a specific host.

## Logging to Syslog

If you want Ansible logs to go through syslog (for centralized logging with rsyslog, syslog-ng, or a log aggregator), you can use a custom callback or pipe the output:

```bash
# Pipe Ansible output to logger for syslog integration
ansible-playbook deploy.yml 2>&1 | logger -t ansible
```

For a more integrated approach, create a simple callback plugin:

```python
# callback_plugins/syslog_logger.py

import syslog
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    """Send Ansible events to syslog."""
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'syslog_logger'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super().__init__()
        syslog.openlog('ansible', syslog.LOG_PID, syslog.LOG_USER)

    def v2_playbook_on_play_start(self, play):
        syslog.syslog(syslog.LOG_INFO, "PLAY: {}".format(play.get_name()))

    def v2_runner_on_ok(self, result):
        host = result._host.get_name()
        task = result._task.get_name()
        syslog.syslog(syslog.LOG_INFO, "OK: {} - {}".format(host, task))

    def v2_runner_on_failed(self, result, ignore_errors=False):
        host = result._host.get_name()
        task = result._task.get_name()
        msg = result._result.get('msg', 'No error message')
        syslog.syslog(syslog.LOG_ERR, "FAILED: {} - {} - {}".format(host, task, msg))

    def v2_runner_on_unreachable(self, result):
        host = result._host.get_name()
        syslog.syslog(syslog.LOG_WARNING, "UNREACHABLE: {}".format(host))
```

Enable it in ansible.cfg:

```ini
# ansible.cfg
[defaults]
callback_whitelist = syslog_logger
callback_plugins = ./callback_plugins
```

## Logging Sensitive Data Considerations

Ansible's `no_log` parameter prevents sensitive data from appearing in logs:

```yaml
# Example: hiding sensitive task output from logs
- name: Set database password
  ansible.builtin.user:
    name: dbadmin
    password: "{{ vault_db_password | password_hash('sha512') }}"
  no_log: true
```

When `no_log: true` is set on a task, the task result is replaced with "censored" in both the terminal output and the log file. Always use this for tasks that handle passwords, API keys, or other secrets.

You can also set `no_log` globally for all tasks (though this makes debugging very difficult):

```ini
# ansible.cfg - NOT recommended for regular use
[defaults]
no_log = True
```

## CI/CD Pipeline Logging

In CI/CD pipelines, you often want the log file stored as an artifact. Here is an example with a shell script wrapper:

```bash
#!/bin/bash
# run-ansible.sh - Wrapper script for CI/CD pipeline

LOG_DIR="/var/log/ansible/ci"
LOG_FILE="${LOG_DIR}/run-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "${LOG_DIR}"

# Set the log path and run the playbook
export ANSIBLE_LOG_PATH="${LOG_FILE}"
export ANSIBLE_FORCE_COLOR=true

ansible-playbook "$@"
EXIT_CODE=$?

echo "Log file: ${LOG_FILE}"
echo "Exit code: ${EXIT_CODE}"

exit ${EXIT_CODE}
```

Use it in your CI pipeline:

```bash
# In your CI/CD pipeline
./run-ansible.sh -i inventory/production.ini playbooks/deploy.yml
```

## Monitoring Log Files

Set up a basic monitoring alert for failed playbook runs by watching the log file:

```bash
#!/bin/bash
# check-ansible-failures.sh
# Run this from cron to detect recent failures

LOG_FILE="/var/log/ansible/ansible.log"
HOURS=24

# Count failures in the last N hours
FAILURES=$(find "${LOG_FILE}" -mmin -$((HOURS * 60)) -exec grep -c "FAILED" {} \;)

if [ "${FAILURES}" -gt 0 ]; then
    echo "WARNING: ${FAILURES} failed tasks in the last ${HOURS} hours"
    # Send alert (email, Slack, PagerDuty, etc.)
fi
```

## Summary

Enabling Ansible file logging is a one-line configuration change (`log_path` in ansible.cfg), but doing it well requires a bit more thought. Set up log rotation to prevent disk space issues, use structured logging (JSON or per-host files) for easier parsing, protect sensitive data with `no_log`, and integrate with your existing log management infrastructure. For production environments, logging is not optional; it is essential for debugging, auditing, and compliance.
