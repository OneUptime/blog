# How to Configure Multiple Callback Plugins in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Configuration, DevOps

Description: Learn how to enable and configure multiple Ansible callback plugins simultaneously for output formatting, logging, profiling, and notifications.

---

Ansible supports running multiple callback plugins at the same time, but there are rules about how they combine. Understanding these rules lets you build a callback stack that gives you formatted terminal output, performance profiling, file logging, and notifications all in one playbook run.

## The Callback Types

Ansible has three categories of callback plugins:

**stdout callbacks** control the main output in your terminal. Only one can be active at a time. Examples: `default`, `minimal`, `oneline`, `ansible.posix.json`, `community.general.dense`.

**aggregate callbacks** add extra output alongside the stdout callback. Multiple aggregate callbacks can run simultaneously. Examples: `ansible.posix.timer`, `ansible.posix.profile_tasks`, `ansible.posix.profile_roles`, `ansible.builtin.junit`.

**notification callbacks** run in the background to send or write events elsewhere. Multiple notification callbacks can run simultaneously. Examples: `community.general.mail`, `community.general.slack`, `community.general.syslog_json`, `community.general.log_plays`.

The key rule: you get exactly one stdout callback plus as many aggregate and notification callbacks as you want.

## Configuring the Stack

Set your stdout callback with `stdout_callback` and aggregate or notification callbacks with `callbacks_enabled`:

```ini
# ansible.cfg - Configure multiple callback plugins

[defaults]
# One stdout callback (controls terminal output)
stdout_callback = default
callback_result_format = yaml

# Multiple aggregate or notification callbacks (comma-separated)
callbacks_enabled = ansible.posix.timer, ansible.posix.profile_tasks, ansible.posix.profile_roles, ansible.builtin.junit, community.general.log_plays
```

Environment variable equivalent:

```bash
# Set via environment
export ANSIBLE_STDOUT_CALLBACK=default
export ANSIBLE_CALLBACK_RESULT_FORMAT=yaml
export ANSIBLE_CALLBACKS_ENABLED=ansible.posix.timer,ansible.posix.profile_tasks,ansible.posix.profile_roles,ansible.builtin.junit,community.general.log_plays
```

## Recommended Callback Stacks

Here are tested combinations for different use cases.

### Development Stack

For everyday development work, you want readable output with performance data:

```ini
# ansible.cfg - Development callback stack
[defaults]
stdout_callback = default
callback_result_format = yaml
callbacks_enabled = ansible.posix.timer, ansible.posix.profile_tasks

[callback_profile_tasks]
sort_order = descending
task_output_limit = 15
```

This gives you YAML-formatted results (easy to read), per-task timing (spot slow tasks), and total elapsed time.

### CI/CD Stack

For CI/CD pipelines, you need machine-readable output plus human-readable logs:

```ini
# ansible.cfg - CI/CD callback stack
[defaults]
stdout_callback = default
callback_result_format = yaml
callbacks_enabled = ansible.posix.timer, ansible.posix.profile_tasks, ansible.builtin.junit

[callback_junit]
output_dir = ./test-results
fail_on_change = false
include_setup_tasks_in_report = true

[callback_profile_tasks]
sort_order = descending
task_output_limit = 20
```

You get YAML output in the CI log for humans, JUnit XML for the CI test result viewer, and timing data to track performance.

### Production Deployment Stack

For production deployments, add notifications and logging:

```ini
# ansible.cfg - Production deployment callback stack
[defaults]
stdout_callback = default
callbacks_enabled = ansible.posix.timer, ansible.posix.profile_tasks, ansible.posix.profile_roles, community.general.log_plays, community.general.slack, community.general.syslog_json

[callback_log_plays]
log_folder = /var/log/ansible/hosts

[callback_slack]
webhook_url = https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
channel = #deployments

[callback_profile_tasks]
sort_order = descending
task_output_limit = 10
```

This gives you standard output in the terminal, per-host log files for auditing, Slack notifications for the team, syslog integration for centralized logging, and performance profiling.

### Compliance Auditing Stack

For compliance and security auditing:

```ini
# ansible.cfg - Compliance audit callback stack
[defaults]
stdout_callback = default
callback_result_format = yaml
callbacks_enabled = ansible.posix.timer, community.general.log_plays, ansible.builtin.junit

[callback_log_plays]
log_folder = /var/log/ansible/audit

[callback_junit]
output_dir = /var/log/ansible/junit
fail_on_change = true
```

This produces three types of output: readable terminal output, per-host log files, and JUnit XML where any change is flagged as a failure.

## Loading Order and Precedence

For callbacks enabled in configuration, the stdout callback receives events first. The other callbacks receive events in the order you list them in `callbacks_enabled`.

For callbacks loaded from callback plugin directories, Ansible loads plugin files in alphanumeric order. For example, `1_first.py` runs before `2_second.py`.

## Configuring Each Callback

Each callback has its own configuration section in `ansible.cfg`. The section name follows the pattern `[callback_PLUGIN_NAME]`:

```ini
# ansible.cfg - Individual callback configurations
[defaults]
stdout_callback = default
callback_result_format = yaml
callbacks_enabled = ansible.posix.timer, ansible.posix.profile_tasks, ansible.builtin.junit, community.general.log_plays

# Timer has no configuration options

# profile_tasks configuration
[callback_profile_tasks]
sort_order = descending
task_output_limit = 20

# JUnit configuration
[callback_junit]
output_dir = ./junit-results
fail_on_change = false
include_setup_tasks_in_report = true

# log_plays configuration
[callback_log_plays]
log_folder = /var/log/ansible/hosts
```

## Dynamic Callback Selection

Change your callback stack per run using environment variables:

```bash
#!/bin/bash
# run-ansible.sh - Select callback stack based on context
MODE="${1:-dev}"

case $MODE in
    dev)
        export ANSIBLE_STDOUT_CALLBACK=default
        export ANSIBLE_CALLBACK_RESULT_FORMAT=yaml
        export ANSIBLE_CALLBACKS_ENABLED=ansible.posix.timer,ansible.posix.profile_tasks
        ;;
    ci)
        export ANSIBLE_STDOUT_CALLBACK=default
        export ANSIBLE_CALLBACK_RESULT_FORMAT=yaml
        export ANSIBLE_CALLBACKS_ENABLED=ansible.posix.timer,ansible.posix.profile_tasks,ansible.builtin.junit
        export JUNIT_OUTPUT_DIR=./test-results
        ;;
    prod)
        export ANSIBLE_STDOUT_CALLBACK=default
        export ANSIBLE_CALLBACKS_ENABLED=ansible.posix.timer,ansible.posix.profile_tasks,community.general.log_plays,community.general.slack
        ;;
esac

shift
ansible-playbook "$@"
```

Usage:

```bash
# Development mode
./run-ansible.sh dev -i inventory/dev deploy.yml

# CI mode
./run-ansible.sh ci -i inventory/staging deploy.yml

# Production mode
./run-ansible.sh prod -i inventory/production deploy.yml
```

## Verifying Active Callbacks

Check which callbacks are active:

```bash
# List all available callback plugins
ansible-doc -t callback -l

# Show details about a specific callback
ansible-doc -t callback ansible.builtin.default
ansible-doc -t callback ansible.posix.timer
```

To verify your callback stack is working, run a simple playbook and check for output from each callback:

```bash
# Test with verbose mode to see callback loading
ansible-playbook site.yml -vvv 2>&1 | grep -i callback
```

## Performance Impact

Each aggregate or notification callback adds some overhead per event. For local callbacks such as `ansible.posix.profile_tasks` and `ansible.posix.timer`, this is usually small. Network-based callbacks such as Slack, Logstash, or remote syslog callbacks can add latency from network I/O.

Tips for minimizing impact:

- Use UDP for syslog when milliseconds matter
- Keep network callback configuration simple and test it in the same environment where playbooks run
- Use only the callbacks that produce output you actually consume
- JUnit writes to disk at the end, not during execution

Running 5-6 aggregate or notification callbacks simultaneously is perfectly fine for almost all use cases.

## Troubleshooting

If a callback is not working:

1. Check that it is enabled: `grep callbacks_enabled ansible.cfg`
2. Check that the collection is installed: `ansible-galaxy collection list`
3. Check for import errors: `ansible-playbook site.yml -vvv 2>&1 | grep -i error`
4. Verify the callback type: stdout callbacks go in `stdout_callback`, aggregate and notification callbacks go in `callbacks_enabled`

A common mistake is putting an aggregate or notification callback in `stdout_callback` or vice versa. If you set `stdout_callback = timer`, it will not work because timer is an aggregate callback, not a stdout callback.

Multiple callbacks working together give you the full picture of every Ansible run. Set up your stack once in `ansible.cfg` and every playbook run automatically gets formatted output, performance data, persistent logs, and notifications.
