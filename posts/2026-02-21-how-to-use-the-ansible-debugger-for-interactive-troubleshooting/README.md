# How to Use the Ansible Debugger for Interactive Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Troubleshooting, DevOps

Description: Learn how to use the Ansible debugger to interactively inspect and fix failing tasks during playbook execution without restarting from scratch.

---

When an Ansible task fails, the normal workflow is to read the error message, edit the playbook, and run it again from the beginning. For simple playbooks this is fine, but when you have a 30-minute deployment pipeline and the failure happens at task 47 out of 50, rerunning everything from scratch is painful. The Ansible debugger gives you an interactive prompt right at the point of failure, letting you inspect variables, modify task parameters, and retry the task without restarting the entire playbook.

## Enabling the Debugger

There are several ways to activate the debugger. The most common is the `debugger` keyword, which you can set at the play, role, block, or task level.

### Enable on a Specific Task

```yaml
---
# debug-example.yml
# The debugger activates only if this specific task fails

- hosts: webservers
  become: yes
  tasks:
    - name: Deploy application config
      template:
        src: templates/app.conf.j2
        dest: /etc/myapp/app.conf
      debugger: on_failed    # Drop into debugger only when this task fails
```

### Enable for an Entire Play

```yaml
---
# debug-play.yml
# The debugger is active for every task in this play

- hosts: webservers
  become: yes
  debugger: on_failed    # Any task failure in this play triggers the debugger

  tasks:
    - name: Install packages
      apt:
        name: "{{ packages }}"
        state: present

    - name: Deploy configuration
      template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
```

### Debugger Trigger Options

The `debugger` keyword accepts these values:

```yaml
# Available debugger activation modes:
# always    - Enter debugger before and after every task (very verbose)
# never     - Never enter debugger (default behavior)
# on_failed - Enter debugger only when a task fails
# on_unreachable - Enter debugger when a host is unreachable
# on_skipped - Enter debugger when a task is skipped
```

### Enable via Configuration

You can also enable the debugger globally through `ansible.cfg` or an environment variable:

```ini
# ansible.cfg
[defaults]
# Enable the debug strategy globally
# This makes all tasks drop into the debugger on failure
enable_task_debugger = True
```

```bash
# Or use an environment variable
export ANSIBLE_ENABLE_TASK_DEBUGGER=True
ansible-playbook deploy.yml
```

## Debugger Commands

When the debugger activates, you get an interactive prompt. Here are the available commands:

| Command | Shortcut | Description |
|---|---|---|
| `print` | `p` | Print task/variable information |
| `task.args[key] = value` | | Modify task arguments |
| `task_vars[key] = value` | | Modify task variables |
| `update_task` | `u` | Re-run the task with your modifications |
| `redo` | `r` | Re-run the task unchanged |
| `continue` | `c` | Continue to the next task (mark current as successful) |
| `quit` | `q` | Quit the playbook |

## A Practical Debugging Session

Let me walk through a real debugging scenario. Suppose you have this playbook:

```yaml
---
# deploy-config.yml
# A playbook with a deliberate typo for demonstration

- hosts: webservers
  become: yes
  debugger: on_failed
  vars:
    app_port: 8080
    app_host: "0.0.0.0"
    max_connections: 100

  tasks:
    - name: Create config directory
      file:
        path: /etc/myapp
        state: directory

    - name: Deploy application configuration
      template:
        src: templates/app.conf.j2
        dest: "/etc/myapp/app.conf"
        owner: myapp
        group: myapp
        mode: '0644'
```

When the template task fails (maybe the template has a variable typo), you see:

```
TASK [Deploy application configuration] ***
fatal: [web01]: FAILED! => {"changed": false, "msg": "AnsibleUndefinedVariable: 'max_conections' is undefined"}
[web01] TASK: Deploy application configuration (debug)>
```

Now you are in the debugger. Here is what you can do:

```
# Print the current task details
[web01] TASK: Deploy application configuration (debug)> p task.args
{'src': 'templates/app.conf.j2', 'dest': '/etc/myapp/app.conf', 'owner': 'myapp', 'group': 'myapp', 'mode': '0644'}

# Print available variables to find the right name
[web01] TASK: Deploy application configuration (debug)> p task_vars['max_connections']
100

# The template uses 'max_conections' (typo) instead of 'max_connections'
# Fix it by setting the misspelled variable to the correct value
[web01] TASK: Deploy application configuration (debug)> task_vars['max_conections'] = task_vars['max_connections']

# Re-run the task with the fix
[web01] TASK: Deploy application configuration (debug)> redo
```

## Inspecting Variables in the Debugger

The `print` command is your most useful tool in the debugger:

```
# Print all task arguments
(debug)> p task.args

# Print a specific variable
(debug)> p task_vars['ansible_hostname']

# Print the result of the failed task
(debug)> p result._result

# Print the error message
(debug)> p result._result['msg']

# Print host facts
(debug)> p task_vars['ansible_os_family']

# Print the full task object
(debug)> p task

# Print the name of the task
(debug)> p task.name
```

## Modifying Task Arguments

You can change task parameters on the fly:

```
# Change the source template path
(debug)> task.args['src'] = 'templates/app.conf.v2.j2'

# Change the destination path
(debug)> task.args['dest'] = '/etc/myapp/app-test.conf'

# Change the file mode
(debug)> task.args['mode'] = '0600'

# Apply changes and retry the task
(debug)> redo
```

## Using the Debugger with Blocks

The debugger works well with blocks, allowing you to debug rescue scenarios:

```yaml
---
# block-debug.yml
# Using the debugger with block/rescue

- hosts: webservers
  become: yes
  tasks:
    - name: Deploy with error handling
      block:
        - name: Install from primary repo
          apt:
            name: custom-package
            state: present
          debugger: on_failed

      rescue:
        - name: Fall back to secondary repo
          apt:
            deb: "https://backup.example.com/packages/custom-package.deb"
          debugger: on_failed
```

## Strategy-Based Debugging

The `debug` strategy is more aggressive than the `debugger` keyword. It drops you into the debugger for every failure across all plays:

```yaml
---
# strategy-debug.yml
# Use the debug strategy for comprehensive debugging

- hosts: webservers
  strategy: debug    # Every failure triggers the debugger
  become: yes
  tasks:
    - name: Task 1
      command: /bin/true

    - name: Task 2 will fail
      command: /bin/false

    - name: Task 3
      command: echo "this task is fine"
```

Or set it via command line:

```bash
# Run with debug strategy without modifying the playbook
ANSIBLE_STRATEGY=debug ansible-playbook deploy.yml
```

## Combining with Verbose Mode

The debugger becomes even more useful when combined with verbose output:

```bash
# Run with increased verbosity for more context in the debugger
ansible-playbook deploy.yml -vvv
```

With `-vvv`, the debugger shows you the full module arguments, connection details, and the raw response from the managed host.

## Practical Tips

**Use `on_failed` mode for production debugging.** The `always` mode stops at every single task and is only useful in rare situations.

**Set variables to work around issues temporarily.** If a variable is not resolving correctly, set it directly in the debugger and retry. Then fix the root cause in your code afterward.

**Use `continue` to skip past a non-critical failure.** If a task fails but you know it is safe to proceed, `continue` marks it as successful and moves on.

**Do not use the debugger in CI/CD.** It requires interactive input, so automated pipelines will hang. Use the `never` value or remove the `debugger` keyword for CI runs.

## Wrapping Up

The Ansible debugger saves you from the frustrating cycle of edit-run-wait-fail-repeat. By dropping into an interactive shell at the exact point of failure, you can inspect the state of every variable, tweak task arguments, and retry without losing all the work from the previous tasks. Enable it with `debugger: on_failed` on tasks you are developing or troubleshooting, and switch to the `debug` strategy when you need to investigate a particularly stubborn issue across an entire playbook.
