# How to Enable and Use the Ansible Task Debugger

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Task Debugger, Troubleshooting

Description: Learn how to enable and configure the Ansible task debugger at different scopes to interactively troubleshoot failed tasks in your playbooks.

---

The Ansible task debugger is a strategy plugin that pauses playbook execution when a task fails and drops you into an interactive shell. While I covered the basics of the interactive debugger in a previous post, this one focuses specifically on the different ways to enable the task debugger, configure its behavior, and integrate it into your development workflow.

## Enabling the Task Debugger: All the Options

There are four distinct ways to enable the task debugger, each with different scopes and use cases.

### Method 1: The debugger Keyword

The `debugger` keyword can be set at the task, block, play, or role level:

```yaml
---
# Play-level: debugger activates for any failed task in this play
- name: Deploy application
  hosts: webservers
  debugger: on_failed

  tasks:
    # Task-level: overrides play-level setting for this specific task
    - name: This task will never trigger the debugger
      ansible.builtin.command:
        cmd: echo "hello"
      debugger: never

    # This task inherits the play-level debugger setting
    - name: Install application
      ansible.builtin.apt:
        name: myapp
        state: present
```

The keyword accepts five values:

| Value | When debugger activates |
|-------|------------------------|
| `always` | After every task, regardless of outcome |
| `never` | Never activates |
| `on_failed` | When a task fails |
| `on_unreachable` | When a host is unreachable |
| `on_skipped` | When a task is skipped |

### Method 2: Configuration File

Add this to your `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
enable_task_debugger = True
```

This is equivalent to setting `debugger: on_failed` on every play. It is useful during development when you want the debugger available without modifying playbooks.

### Method 3: Environment Variable

```bash
# Enable the task debugger via environment variable
export ANSIBLE_ENABLE_TASK_DEBUGGER=True
ansible-playbook deploy.yml
```

This is handy for one-off debugging sessions:

```bash
# Debug a specific playbook run without changing any files
ANSIBLE_ENABLE_TASK_DEBUGGER=True ansible-playbook site.yml --limit web-01
```

### Method 4: Debug Strategy Plugin

The debug strategy replaces the default `linear` strategy and provides the same interactive debugging:

```yaml
---
- name: Deploy with debug strategy
  hosts: webservers
  strategy: debug

  tasks:
    - name: All failed tasks trigger debugger
      ansible.builtin.apt:
        name: nonexistent-package
        state: present
```

Or via environment variable:

```bash
ANSIBLE_STRATEGY=debug ansible-playbook deploy.yml
```

## Priority and Inheritance

When multiple methods are in play, the most specific setting wins. Here is the priority order from highest to lowest:

1. Task-level `debugger` keyword
2. Block-level `debugger` keyword
3. Role-level `debugger` keyword
4. Play-level `debugger` keyword
5. Configuration/environment variable settings

```yaml
---
- name: Example of priority
  hosts: webservers
  debugger: on_failed  # Play level

  tasks:
    - name: Block with debugger override
      block:
        - name: This task never triggers debugger
          ansible.builtin.command:
            cmd: might-fail
          debugger: never  # Task level wins over block

        - name: This task uses block-level setting
          ansible.builtin.command:
            cmd: might-also-fail
          # Inherits block-level: always
      debugger: always  # Block level overrides play level
```

## Debugger Commands Reference

Once inside the debugger, you have access to these commands:

```
p <expression>     Print/evaluate a Python expression
task.args          Show task module arguments
task_vars          Access all task variables
result._result     Show the task result
u <key>=<value>    Update a module argument or variable
r                  Re-run the task
c                  Continue to the next task (skip this failure)
q                  Quit the playbook
```

## Practical Workflow: Debugging a Role

Here is a practical example of debugging a role that sets up a web application. First, the role structure:

```
roles/webapp/
  tasks/
    main.yml
    install.yml
    configure.yml
  templates/
    nginx.conf.j2
    app.env.j2
  defaults/
    main.yml
```

The main task file with debugger annotations:

```yaml
# roles/webapp/tasks/main.yml
---
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include configuration tasks
  ansible.builtin.include_tasks: configure.yml
  debugger: on_failed
  # Only debug configuration issues, not installation
```

The configuration tasks:

```yaml
# roles/webapp/tasks/configure.yml
---
- name: Create application directory
  ansible.builtin.file:
    path: "{{ webapp_install_dir }}"
    state: directory
    owner: "{{ webapp_user }}"
    mode: "0755"

- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ webapp_name }}.conf
  notify: Reload nginx

- name: Deploy environment file
  ansible.builtin.template:
    src: app.env.j2
    dest: "{{ webapp_install_dir }}/.env"
    owner: "{{ webapp_user }}"
    mode: "0600"
```

When the nginx template fails because of an undefined variable, the debugger session might look like this:

```
TASK [webapp : Deploy nginx configuration] ************************************
fatal: [web-01]: FAILED! => {"changed": false, "msg": "AnsibleUndefinedVariable:
  'webapp_server_name' is undefined"}

[web-01] TASK: webapp : Deploy nginx configuration (debug)> p task_vars['webapp_name']
'myapp'

[web-01] TASK: webapp : Deploy nginx configuration (debug)> p task_vars.get('webapp_server_name', 'NOT DEFINED')
'NOT DEFINED'

# The variable is missing from defaults. Set it and retry.
[web-01] TASK: webapp : Deploy nginx configuration (debug)> task_vars['webapp_server_name'] = 'myapp.example.com'
[web-01] TASK: webapp : Deploy nginx configuration (debug)> r

ok: [web-01]
```

After the debugging session, you know to add `webapp_server_name` to `roles/webapp/defaults/main.yml`.

## Debugging with Multiple Hosts

When running against multiple hosts, the debugger activates separately for each failing host. This can be useful for host-specific issues:

```yaml
---
- name: Configure cluster
  hosts: cluster_nodes
  debugger: on_failed

  tasks:
    - name: Set cluster node ID
      ansible.builtin.template:
        src: cluster.conf.j2
        dest: /etc/cluster/node.conf
```

If `node-02` fails but `node-01` and `node-03` succeed, you get a debugger prompt just for `node-02`:

```
TASK [Set cluster node ID] ****************************************************
ok: [node-01]
fatal: [node-02]: FAILED! => {"changed": false, "msg": "..."}
ok: [node-03]

[node-02] TASK: Set cluster node ID (debug)> p task_vars['ansible_host']
'10.0.1.12'

[node-02] TASK: Set cluster node ID (debug)> p task_vars.get('cluster_node_id', 'NOT SET')
'NOT SET'
```

## Creating a Debug-Friendly Development Setup

For regular development work, I keep a separate ansible.cfg for debugging:

```ini
# ansible-debug.cfg
[defaults]
enable_task_debugger = True
stdout_callback = yaml
# Limit forks to 1 so debugger sessions don't overlap
forks = 1
# Show full diffs for file changes
diff = True
```

Then use it when needed:

```bash
# Use the debug config for this session
ANSIBLE_CONFIG=ansible-debug.cfg ansible-playbook deploy.yml --limit web-01
```

Setting `forks = 1` is important because with multiple forks, debugger prompts from different hosts can interleave and become confusing.

## Using the Debugger with Check Mode

You can combine the debugger with check mode for safe exploration:

```bash
# Dry run with debugger - no changes will be made
ANSIBLE_ENABLE_TASK_DEBUGGER=True ansible-playbook deploy.yml --check
```

This lets you examine variables and task arguments without any risk of changing the target systems. When a task "fails" in check mode (which often happens with command/shell tasks), you can inspect the state and continue.

## Automating Debugger Enablement per Environment

Use group_vars to control debugger behavior by environment:

```yaml
# group_vars/development.yml
ansible_debugger: on_failed

# group_vars/production.yml
ansible_debugger: never
```

Then reference it in your playbook:

```yaml
---
- name: Deploy application
  hosts: webservers
  debugger: "{{ ansible_debugger | default('never') }}"

  tasks:
    - name: Deploy configuration
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
```

Development hosts get interactive debugging; production hosts never pause for the debugger, even if a task fails.

## When Not to Use the Task Debugger

The task debugger is a development and manual troubleshooting tool. Do not use it in:

- CI/CD pipelines (no terminal to interact with)
- Scheduled/cron Ansible runs
- AWX/Tower job runs
- Any automated, unattended execution

For these scenarios, use verbose logging, callback plugins, and the debug module instead.

## Summary

The Ansible task debugger can be enabled through the `debugger` keyword (most granular), configuration file, environment variable, or the debug strategy plugin. The keyword approach gives you the most control over which tasks trigger debugging. For development, combine it with `forks = 1` and a dedicated ansible.cfg to create a smooth debugging experience. Use environment-based configuration to ensure the debugger is never active in production automated runs where no one is watching the terminal.
