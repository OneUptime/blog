# How to Use the Ansible debug Strategy for Interactive Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Strategy Plugins, Debugging, Troubleshooting

Description: Use the Ansible debug strategy to pause playbook execution on task failures and interactively inspect variables, re-run tasks, and troubleshoot issues.

---

The `debug` strategy is Ansible's interactive debugger. When a task fails, instead of moving on or stopping the playbook, Ansible drops you into an interactive prompt where you can inspect variables, modify the task, re-run it, or continue execution. It is like a breakpoint debugger for your infrastructure code.

## Enabling the Debug Strategy

Set it per play:

```yaml
# debug-example.yml - Use the debug strategy
---
- name: Deploy with debugging
  hosts: webservers
  strategy: debug

  tasks:
    - name: Deploy application config
      template:
        src: app.conf.j2
        dest: /etc/app/config.yml
```

Or set it globally:

```ini
# ansible.cfg
[defaults]
strategy = debug
```

You can also enable it with an environment variable:

```bash
# Enable debug strategy for this run
ANSIBLE_STRATEGY=debug ansible-playbook site.yml
```

## What Happens on Failure

When a task fails with the debug strategy, Ansible pauses and presents a debug prompt:

```
TASK [Deploy application config] *********************************************
fatal: [web-01]: FAILED! => {"changed": false, "msg": "Could not find or access '/home/user/templates/app.conf.j2'"}

Debugger invoked
(debug)
```

At this prompt, you have several commands available.

## Debug Commands

The debugger supports these commands:

```
(debug) p task           # Print the task definition
(debug) p task.args      # Print the task arguments
(debug) p result         # Print the task result (including error)
(debug) p vars           # Print all available variables
(debug) p host           # Print the current host
(debug) p task_vars      # Print task-specific variables

(debug) task.args['src'] = 'templates/app.conf.j2'  # Modify task arguments
(debug) vars['app_port'] = 8080                       # Set a variable

(debug) redo             # Re-run the task with current args/vars
(debug) continue         # Continue to the next task (skip this failure)
(debug) quit             # Quit the playbook
```

## Practical Debugging Session

Let's walk through a real debugging session. You have a playbook that fails:

```yaml
# deploy.yml
---
- name: Deploy application
  hosts: web-01
  strategy: debug
  become: true

  vars:
    app_version: "2.5.1"
    app_port: 8080

  tasks:
    - name: Create app directory
      file:
        path: /opt/myapp
        state: directory

    - name: Deploy config from template
      template:
        src: app.conf.j2
        dest: /opt/myapp/config.yml

    - name: Start application
      command: /opt/myapp/start.sh --port {{ app_port }}
```

The template task fails because the template has a typo in a variable name:

```
TASK [Deploy config from template] *******************************************
fatal: [web-01]: FAILED! => {"msg": "AnsibleUndefinedVariable: 'app_vesion' is undefined"}

Debugger invoked
(debug)
```

Debug the issue:

```
(debug) p task.args
{'src': 'app.conf.j2', 'dest': '/opt/myapp/config.yml'}

(debug) p vars['app_version']
'2.5.1'

# The error says 'app_vesion' (typo) is undefined
# We can set the misspelled variable as a workaround to continue
(debug) task_vars['app_vesion'] = task_vars['app_version']

# Re-run the task with the fix
(debug) redo

ok: [web-01]

# Task succeeded, continue to the next task
```

Of course, the real fix is to correct the typo in your template file, but the debugger lets you continue the playbook run to test the remaining tasks.

## Inspecting Variables

The debugger is excellent for understanding what variables are available:

```
(debug) p vars.keys()
dict_keys(['ansible_hostname', 'ansible_os_family', 'inventory_hostname',
           'app_version', 'app_port', 'ansible_facts', ...])

(debug) p vars['ansible_hostname']
'web-01'

(debug) p vars['ansible_os_family']
'Debian'

# Check a specific fact
(debug) p vars['ansible_facts']['os_family']
'Debian'

# Check the full result of the failed task
(debug) p result._result
{'changed': False, 'msg': "AnsibleUndefinedVariable: 'app_vesion' is undefined"}
```

## Modifying Task Arguments

You can change task arguments and re-run:

```
TASK [Install package] ********************************************************
fatal: [web-01]: FAILED! => {"msg": "No package matching 'ngix' found"}

Debugger invoked
(debug) p task.args
{'name': 'ngix', 'state': 'present'}

# Fix the package name
(debug) task.args['name'] = 'nginx'

# Re-run with corrected name
(debug) redo

changed: [web-01]
```

## Using Debug Strategy Selectively

You do not have to use the debug strategy for the entire play. Use it only when actively troubleshooting:

```bash
# Normal run
ansible-playbook deploy.yml

# Debugging run
ANSIBLE_STRATEGY=debug ansible-playbook deploy.yml

# Or for a specific play only
```

A good practice is to add a comment in your playbook when you temporarily enable debugging:

```yaml
- name: Deploy application
  hosts: webservers
  # strategy: debug  # Uncomment for debugging
  tasks:
    - name: ...
```

## Debug Strategy with Breakpoints

You can force the debugger to activate on specific tasks using `debugger: on_failed` or `debugger: always`:

```yaml
# selective-debug.yml - Debug specific tasks
---
- name: Deploy with selective debugging
  hosts: webservers
  # Use linear strategy (not debug), but debug specific tasks

  tasks:
    - name: Install packages (no debugging)
      apt:
        name: nginx
        state: present

    - name: Deploy config (debug on failure)
      template:
        src: app.conf.j2
        dest: /etc/app/config.yml
      debugger: on_failed

    - name: Start service (always debug)
      service:
        name: myapp
        state: started
      debugger: always  # Drops into debugger even on success
```

The `debugger` keyword options:

- `always` - always invoke the debugger
- `never` - never invoke the debugger
- `on_failed` - invoke on failure
- `on_unreachable` - invoke when host is unreachable
- `on_skipped` - invoke when task is skipped

## Using Debug Strategy in Roles

When debugging a role, the debugger shows the role context:

```
TASK [webserver : Deploy nginx config] ****************************************
fatal: [web-01]: FAILED! => {"msg": "..."}

Debugger invoked
(debug) p task.get_name()
'webserver : Deploy nginx config'

(debug) p task.role
<Role: webserver>
```

You can inspect role variables:

```
(debug) p vars['webserver_port']
80
```

## Limitations

The debug strategy has some limitations:

- It only works interactively. You cannot use it in CI/CD or background runs.
- It requires a TTY (terminal). Piped or redirected output will not work.
- Each host failure drops into the debugger separately, which can be tedious with many hosts.
- The `redo` command re-runs the task on the current host only, not all hosts.

## Tips for Effective Debugging

Start with `p result._result` to see the exact error. Then inspect the relevant variables with `p vars['variable_name']`. If the fix is a simple argument change, modify and `redo`. If the issue requires code changes, `quit` the debugger, fix the code, and re-run the playbook.

For template debugging, you can render the template manually:

```
(debug) p lookup('template', 'app.conf.j2')
```

The debug strategy is one of those tools that you forget about until you really need it. When a playbook fails in a way you do not understand, dropping into the interactive debugger and inspecting the actual state of variables and task arguments is often faster than adding debug tasks and re-running the whole playbook.
