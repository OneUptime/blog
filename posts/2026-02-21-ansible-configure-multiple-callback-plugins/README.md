# How to Configure Multiple Callback Plugins in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Configuration, DevOps

Description: Learn how to enable and configure multiple Ansible callback plugins simultaneously for output formatting, logging, profiling, and notifications.

---

Ansible supports running multiple callback plugins at the same time, but there are rules about how they combine. Understanding these rules lets you build a callback stack that gives you formatted terminal output, performance profiling, file logging, and notifications all in one playbook run.

## The Two Types of Callbacks

Ansible has two categories of callback plugins:

**stdout callbacks** control what appears in your terminal. Only one can be active at a time. If you set multiple stdout callbacks, the last one wins. Examples: `default`, `yaml`, `json`, `dense`, `minimal`.

**notification callbacks** run in the background and do not affect terminal output. Multiple notification callbacks can run simultaneously. Examples: `timer`, `profile_tasks`, `profile_roles`, `junit`, `mail`, `slack`, `syslog`, `log_plays`, `tree`.

The key rule: you get exactly one stdout callback plus as many notification callbacks as you want.

## Configuring the Stack

Set your stdout callback with `stdout_callback` and notification callbacks with `callback_whitelist`:

```ini
# ansible.cfg - Configure multiple callback plugins
[defaults]
# One stdout callback (controls terminal output)
stdout_callback = yaml

# Multiple notification callbacks (comma-separated)
callback_whitelist = timer, profile_tasks, profile_roles, junit, log_plays
```

Environment variable equivalent:

```bash
# Set via environment
export ANSIBLE_STDOUT_CALLBACK=yaml
export ANSIBLE_CALLBACK_WHITELIST=timer,profile_tasks,profile_roles,junit,log_plays
```

## Recommended Callback Stacks

Here are tested combinations for different use cases.

### Development Stack

For everyday development work, you want readable output with performance data:

```ini
# ansible.cfg - Development callback stack
[defaults]
stdout_callback = yaml
callback_whitelist = timer, profile_tasks

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
stdout_callback = yaml
callback_whitelist = timer, profile_tasks, junit

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
callback_whitelist = timer, profile_tasks, profile_roles, log_plays, community.general.slack, community.general.syslog

[callback_log_plays]
log_folder = /var/log/ansible/hosts

[callback_slack]
webhook_url = {{ lookup('env', 'SLACK_WEBHOOK_URL') }}
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
stdout_callback = yaml
callback_whitelist = timer, log_plays, tree, junit

[callback_log_plays]
log_folder = /var/log/ansible/audit

[callback_tree]
directory = /var/log/ansible/tree

[callback_junit]
output_dir = /var/log/ansible/junit
fail_on_change = true
```

This produces four types of output: readable terminal output, per-host log files, per-host JSON tree files, and JUnit XML where any change is flagged as a failure.

## Loading Order and Precedence

Ansible loads callbacks in a specific order:

1. Built-in callbacks from the Ansible package
2. Callbacks from installed collections
3. Callbacks from the `callback_plugins` directory in your project
4. Callbacks from paths listed in `DEFAULT_CALLBACK_PLUGIN_PATH`

If two callbacks have the same name, the one loaded later wins. This means a project-level callback can override a built-in one.

## Configuring Each Callback

Each callback has its own configuration section in `ansible.cfg`. The section name follows the pattern `[callback_PLUGIN_NAME]`:

```ini
# ansible.cfg - Individual callback configurations
[defaults]
stdout_callback = yaml
callback_whitelist = timer, profile_tasks, junit, log_plays

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
        export ANSIBLE_STDOUT_CALLBACK=yaml
        export ANSIBLE_CALLBACK_WHITELIST=timer,profile_tasks
        ;;
    ci)
        export ANSIBLE_STDOUT_CALLBACK=yaml
        export ANSIBLE_CALLBACK_WHITELIST=timer,profile_tasks,junit
        export JUNIT_OUTPUT_DIR=./test-results
        ;;
    prod)
        export ANSIBLE_STDOUT_CALLBACK=default
        export ANSIBLE_CALLBACK_WHITELIST=timer,profile_tasks,log_plays,community.general.slack
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
ansible-doc -t callback yaml
ansible-doc -t callback timer
```

To verify your callback stack is working, run a simple playbook and check for output from each callback:

```bash
# Test with verbose mode to see callback loading
ansible-playbook site.yml -vvv 2>&1 | grep -i callback
```

## Performance Impact

Each notification callback adds a small amount of overhead per event. For most callbacks, this is negligible (microseconds per task). However, network-based callbacks (slack, logstash, syslog over TCP) add latency proportional to network round-trip time.

Tips for minimizing impact:

- Use UDP for syslog when milliseconds matter
- The slack callback batches messages, so it adds minimal requests
- profile_tasks and timer add effectively zero overhead
- JUnit writes to disk at the end, not during execution

Running 5-6 notification callbacks simultaneously is perfectly fine for almost all use cases.

## Troubleshooting

If a callback is not working:

1. Check that it is in the whitelist: `grep callback_whitelist ansible.cfg`
2. Check that the collection is installed: `ansible-galaxy collection list`
3. Check for import errors: `ansible-playbook site.yml -vvv 2>&1 | grep -i error`
4. Verify the callback type: stdout callbacks go in `stdout_callback`, notification callbacks go in `callback_whitelist`

A common mistake is putting a notification callback in `stdout_callback` or vice versa. If you set `stdout_callback = timer`, it will not work because timer is a notification callback, not a stdout callback.

Multiple callbacks working together give you the full picture of every Ansible run. Set up your stack once in `ansible.cfg` and every playbook run automatically gets formatted output, performance data, persistent logs, and notifications.
