# How to Use the Ansible Debugger for Interactive Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Troubleshooting, Interactive

Description: Learn how to use the Ansible interactive debugger to pause playbook execution, inspect variables, and fix issues in real time.

---

Sometimes adding debug tasks and running your playbook again is not enough. The issue might be intermittent, the data might be different on each host, or you need to explore the execution state interactively. Ansible ships with a built-in interactive debugger that drops you into a command prompt when a task fails, letting you inspect variables, modify them, and retry the task without starting the entire playbook from scratch.

## Enabling the Debugger

There are several ways to enable the Ansible debugger. The most common is using the `debugger` keyword on a task, block, or play.

### On a Single Task

```yaml
# Enable debugger on a specific task
- name: Deploy application config
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/app.conf
  debugger: on_failed
```

### On a Block

```yaml
# Enable debugger for a group of tasks
- name: Database setup
  block:
    - name: Create database
      community.postgresql.postgresql_db:
        name: "{{ db_name }}"

    - name: Create database user
      community.postgresql.postgresql_user:
        name: "{{ db_user }}"
        password: "{{ db_password }}"
  debugger: on_failed
```

### On the Entire Play

```yaml
---
- name: Full deployment
  hosts: webservers
  debugger: on_failed

  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ required_packages }}"
```

## Debugger Trigger Options

The `debugger` keyword accepts several values that control when the debugger activates:

```yaml
# Always drop into debugger, even on success
debugger: always

# Only when the task fails
debugger: on_failed

# Only when the host is unreachable
debugger: on_unreachable

# Only when the task reports a non-ok result (failed or unreachable)
debugger: on_skipped

# Never activate (useful to override inherited settings)
debugger: never
```

The most useful setting is `on_failed`, which only interrupts execution when something goes wrong.

## The Debugger Interface

When the debugger activates, you see a prompt like this:

```
TASK [Deploy application config] **********************************************
fatal: [web-01]: FAILED! => {"changed": false, "msg": "Could not find or access '/home/deploy/templates/app.conf.j2'"}

[web-01] TASK: Deploy application config (debug)>
```

At this prompt, you can type several commands. Here is the complete list:

```
p <expression>    - Print a variable or expression
task.args         - Show current task arguments
task.vars         - Show task variables
vars              - Show all available variables
r                 - Re-run the current task
c                 - Continue to the next task
q                 - Quit the debugger and abort the play
u <key>=<value>   - Update a task argument or variable
```

## Inspecting Variables with p

The `p` (print) command evaluates a Python expression and prints the result:

```
# Print a specific variable
[web-01] TASK: Deploy application config (debug)> p task.args
{'dest': '/etc/app/app.conf', 'src': 'app.conf.j2'}

# Print a host variable
[web-01] TASK: Deploy application config (debug)> p task_vars['inventory_hostname']
'web-01'

# Print the result of the failed task
[web-01] TASK: Deploy application config (debug)> p result._result
{'changed': False, 'msg': "Could not find or access '/home/deploy/templates/app.conf.j2'"}

# Print ansible facts
[web-01] TASK: Deploy application config (debug)> p task_vars['ansible_distribution']
'Ubuntu'
```

## Modifying Variables and Retrying

The real power of the debugger is the ability to fix issues and retry without restarting:

```
# The template path is wrong. Let's fix it.
[web-01] TASK: Deploy application config (debug)> p task.args
{'dest': '/etc/app/app.conf', 'src': 'app.conf.j2'}

# Update the source path to the correct location
[web-01] TASK: Deploy application config (debug)> task.args['src'] = 'templates/app.conf.j2'

# Verify the change
[web-01] TASK: Deploy application config (debug)> p task.args
{'dest': '/etc/app/app.conf', 'src': 'templates/app.conf.j2'}

# Retry the task with the fixed argument
[web-01] TASK: Deploy application config (debug)> r
```

## Practical Debugging Session Example

Let me walk through a realistic debugging session. Say you have this playbook:

```yaml
---
- name: Configure monitoring
  hosts: webservers
  become: true
  debugger: on_failed

  vars:
    monitoring_port: 9090
    alert_recipients:
      - ops-team@example.com

  tasks:
    - name: Install monitoring agent
      ansible.builtin.apt:
        name: prometheus-node-exporter
        state: present

    - name: Configure monitoring port
      ansible.builtin.template:
        src: node_exporter.conf.j2
        dest: /etc/default/prometheus-node-exporter

    - name: Start monitoring service
      ansible.builtin.service:
        name: prometheus-node-exporter
        state: started
        enabled: true
```

When the template task fails, the debugger activates:

```
TASK [Configure monitoring port] **********************************************
fatal: [web-01]: FAILED! => {"changed": false, "msg": "AnsibleUndefinedVariable: 'listen_address' is undefined"}

[web-01] TASK: Configure monitoring port (debug)>
```

Now you can investigate:

```
# Check what variables are available
[web-01] TASK: Configure monitoring port (debug)> p task_vars['monitoring_port']
9090

# The template references listen_address which is not defined
# Let's set it and retry
[web-01] TASK: Configure monitoring port (debug)> task_vars['listen_address'] = '0.0.0.0'

# Retry the task
[web-01] TASK: Configure monitoring port (debug)> r

ok: [web-01]
```

The task succeeds with the variable set, and the playbook continues. You now know you need to add `listen_address` to your vars.

## Enabling the Debugger via Environment Variable

You can enable the debugger without modifying your playbook by setting an environment variable:

```bash
# Enable debugger for all failed tasks
ANSIBLE_ENABLE_TASK_DEBUGGER=True ansible-playbook deploy.yml

# Or set it in ansible.cfg
# [defaults]
# enable_task_debugger = True
```

This is useful for ad-hoc debugging sessions where you do not want to edit the playbook.

## Using the Debugger Strategy Plugin

Another approach is using the debug strategy plugin, which activates the debugger on every failed task across the entire play:

```yaml
---
- name: Deploy with debug strategy
  hosts: webservers
  strategy: debug

  tasks:
    - name: Every failing task will trigger the debugger
      ansible.builtin.command:
        cmd: some-command
```

Or enable it from the command line:

```bash
# Use debug strategy without modifying the playbook
ANSIBLE_STRATEGY=debug ansible-playbook deploy.yml
```

## Examining Task Objects

The debugger gives you access to internal Ansible objects. Here are some useful ones:

```
# Show the task name
[web-01] TASK: ...(debug)> p task.name
'Configure monitoring port'

# Show the module being used
[web-01] TASK: ...(debug)> p task.action
'ansible.builtin.template'

# Show all task arguments
[web-01] TASK: ...(debug)> p task.args
{'src': 'node_exporter.conf.j2', 'dest': '/etc/default/prometheus-node-exporter'}

# Show the failed result
[web-01] TASK: ...(debug)> p result._result
{'changed': False, 'msg': "AnsibleUndefinedVariable: 'listen_address' is undefined"}

# Check if there are any host-specific vars
[web-01] TASK: ...(debug)> p task_vars['ansible_host']
'10.0.1.50'
```

## Workflow for Debugging Complex Issues

Here is my typical workflow when using the interactive debugger:

1. Add `debugger: on_failed` to the play or suspicious task
2. Run the playbook and wait for it to break
3. Use `p result._result` to see the exact error
4. Use `p task.args` to verify task parameters
5. Check relevant variables with `p task_vars['variable_name']`
6. If the fix is simple (wrong variable value, typo), update and retry
7. If the fix requires code changes, note the findings and quit with `q`
8. Fix the playbook and re-run

```yaml
---
# Development playbook with debugger enabled
- name: Deploy application (debug mode)
  hosts: webservers
  debugger: on_failed
  gather_facts: true

  pre_tasks:
    - name: Verify connectivity
      ansible.builtin.ping:

  tasks:
    - name: Step 1 - Install dependencies
      ansible.builtin.apt:
        name: "{{ required_packages }}"
        state: present

    - name: Step 2 - Deploy configuration
      ansible.builtin.template:
        src: "{{ item.src }}"
        dest: "{{ item.dest }}"
      loop: "{{ config_files }}"

    - name: Step 3 - Start services
      ansible.builtin.service:
        name: "{{ item }}"
        state: started
      loop: "{{ managed_services }}"
```

## Limitations and Tips

A few things to keep in mind when using the debugger:

- The debugger only works when running Ansible interactively (not in CI/CD pipelines or cron jobs)
- When running against multiple hosts, the debugger activates once per failing host, which can be tedious with large inventories
- The `r` (retry) command re-runs the task from scratch, including any `when` conditions
- Variable changes made in the debugger only persist for the current task retry
- The debugger uses Python syntax, not Jinja2, so use `task_vars['var_name']` instead of `{{ var_name }}`

## Summary

The Ansible interactive debugger is a powerful tool for troubleshooting playbook issues in real time. Enable it with `debugger: on_failed` on tasks, blocks, or plays, and use `p` to inspect variables, `task.args` to check parameters, and `r` to retry after making fixes. It is most useful during development and manual deployments where you can interact with the terminal. For automated pipelines, stick with the debug module and verbose output instead.
