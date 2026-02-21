# How to Use ansible-navigator for Playbook Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-navigator, Playbook Development, DevOps

Description: Use ansible-navigator's interactive features to develop, test, and debug Ansible playbooks more efficiently than with ansible-playbook.

---

ansible-navigator is not just a replacement for ansible-playbook. It is a development tool that changes how you write and debug playbooks. The interactive TUI lets you drill into task output, inspect variables, and understand exactly what happened during a run. The artifact replay feature lets you share debugging sessions with teammates. This post focuses on using ansible-navigator specifically as a development tool during the playbook writing process.

## Setting Up Your Development Environment

Start by installing ansible-navigator and configuring it for development work:

```bash
# Install ansible-navigator
pip install ansible-navigator

# Create a project-level configuration
cat > ansible-navigator.yml << 'EOF'
---
ansible-navigator:
  execution-environment:
    image: quay.io/ansible/community-ee-minimal:latest
    pull:
      policy: missing
  mode: interactive
  playbook-artifact:
    enable: true
    save-as: "{playbook_dir}/artifacts/{playbook_name}-{time_stamp}.json"
  logging:
    level: debug
    file: /tmp/ansible-navigator.log
EOF
```

The `mode: interactive` default is key for development. It opens the TUI where you can explore playbook results.

## The Interactive TUI Workflow

When you run a playbook in interactive mode, ansible-navigator shows a structured view of the results. This is far more useful than scrolling through terminal output.

Create a development playbook to work with:

```yaml
---
# dev-playbook.yml - A playbook we will develop interactively
- name: Configure web servers
  hosts: localhost
  connection: local
  gather_facts: true
  vars:
    app_config:
      name: myapp
      port: 8080
      workers: 4
      features:
        - logging
        - metrics
        - health_check
  tasks:
    - name: Display system information
      ansible.builtin.debug:
        msg:
          hostname: "{{ ansible_hostname }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          python: "{{ ansible_python_version }}"

    - name: Process application config
      ansible.builtin.set_fact:
        processed_config: >-
          {{ app_config | combine({'environment': 'development'}) }}

    - name: Show processed configuration
      ansible.builtin.debug:
        var: processed_config

    - name: Generate configuration entries
      ansible.builtin.set_fact:
        config_entries: "{{ app_config.features | map('upper') | list }}"

    - name: Display config entries
      ansible.builtin.debug:
        var: config_entries

    - name: Simulate a failing task for debugging practice
      ansible.builtin.command: /bin/false
      register: fail_result
      ignore_errors: true

    - name: Show failure details
      ansible.builtin.debug:
        var: fail_result
      when: fail_result is failed
```

Run it in interactive mode:

```bash
# Run in interactive mode (default with our config)
ansible-navigator run dev-playbook.yml
```

## Navigating the TUI

Once the playbook finishes, you see a list of plays. Here are the most useful navigation commands:

```
# Navigation commands in the TUI
# Type a number to drill into that item
0                    # Select the first play
1                    # Select the second item (task)

# Movement
:back or Esc         # Go back one level
:top                 # Go to the top level

# View modes
:stdout              # Show raw stdout output
:log                 # Show the log
:help                # Show all commands

# Searching
/pattern             # Search for text in the current view

# Quitting
:quit or q           # Exit navigator
```

When you select a task, you see its full output including registered variables, return codes, stdout, and stderr. This is where ansible-navigator beats ansible-playbook for development: instead of re-running with `-v` flags, you just click into the task.

## Developing with Check Mode

Check mode (dry run) is essential during development. ansible-navigator supports it:

```bash
# Run in check mode to see what would change
ansible-navigator run dev-playbook.yml --check --diff
```

In the TUI, check mode results are clearly marked, showing what would change without making actual modifications.

## Using ansible-navigator for Variable Inspection

One of the most powerful development features is inspecting variables at any point during playbook execution.

Create a playbook that builds up complex data structures:

```yaml
---
# variable-debug.yml - Inspect complex variables
- name: Variable inspection demo
  hosts: localhost
  connection: local
  gather_facts: true
  vars:
    servers:
      - name: web01
        role: frontend
        ports: [80, 443]
      - name: app01
        role: backend
        ports: [8080, 8443]
      - name: db01
        role: database
        ports: [5432]
  tasks:
    - name: Build a server lookup table
      ansible.builtin.set_fact:
        server_by_role: >-
          {{ servers | groupby('role') | items2dict(key_name=0, value_name=1) }}

    - name: Show the lookup table
      ansible.builtin.debug:
        var: server_by_role

    - name: Extract all ports across all servers
      ansible.builtin.set_fact:
        all_ports: "{{ servers | map(attribute='ports') | flatten | unique | sort }}"

    - name: Show all ports
      ansible.builtin.debug:
        var: all_ports

    - name: Build an inventory-style structure
      ansible.builtin.set_fact:
        dynamic_inventory:
          all:
            children: "{{ servers | map(attribute='role') | unique | list }}"
          servers: "{{ servers | items2dict(key_name='name', value_name='role') }}"

    - name: Display the dynamic inventory
      ansible.builtin.debug:
        var: dynamic_inventory
```

Run it and drill into each task to see the variable values:

```bash
ansible-navigator run variable-debug.yml
```

In the TUI, select any `debug` task to see the full variable content, including nested structures formatted nicely.

## Iterative Development with Rapid Feedback

During development, you want fast feedback loops. Here are techniques for speeding up iterations:

Limit to specific tasks using tags:

```yaml
---
# tagged-dev.yml - Use tags for selective execution
- name: Development playbook with tags
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Task A - already working
      ansible.builtin.debug:
        msg: "This works fine"
      tags: [working]

    - name: Task B - currently developing
      ansible.builtin.debug:
        msg: "Working on this"
      tags: [dev]

    - name: Task C - not started yet
      ansible.builtin.debug:
        msg: "TODO"
      tags: [todo]
```

Run only the task you are working on:

```bash
# Run only tasks tagged 'dev'
ansible-navigator run tagged-dev.yml --tags dev --mode stdout
```

Use `--start-at-task` to skip ahead:

```bash
# Start at a specific task
ansible-navigator run dev-playbook.yml --start-at-task "Process application config" --mode stdout
```

## Replaying Previous Runs

ansible-navigator saves artifacts (JSON files) from every run. You can replay them to inspect output from previous runs without re-executing the playbook.

```bash
# List saved artifacts
ls artifacts/

# Replay a previous run
ansible-navigator replay artifacts/dev-playbook-2024-02-15T10:30:00.json
```

This opens the same TUI as a live run, letting you drill into every task. Share artifact files with teammates so they can inspect the run on their own machine.

## Testing Roles During Development

When developing roles, you can test them in isolation:

```yaml
---
# test-role.yml - Test a role in isolation
- name: Test the webserver role
  hosts: localhost
  connection: local
  gather_facts: true
  vars:
    webserver_port: 8080
    webserver_root: /var/www/test
  roles:
    - role: webserver
      tags: [webserver]
  tasks:
    - name: Verify role variables were set
      ansible.builtin.debug:
        msg: "Port: {{ webserver_port }}, Root: {{ webserver_root }}"
```

Run it with verbose output to see role task execution:

```bash
ansible-navigator run test-role.yml --mode stdout -v
```

## Using ansible-navigator for Syntax Validation

Before running anything, validate your playbook syntax:

```bash
# Syntax check
ansible-navigator run dev-playbook.yml --syntax-check --mode stdout

# List tasks without executing
ansible-navigator run dev-playbook.yml --list-tasks --mode stdout

# List hosts that would be targeted
ansible-navigator run dev-playbook.yml --list-hosts --mode stdout
```

## Debugging Jinja2 Expressions

When developing complex Jinja2 expressions, use a debug playbook to test them:

```yaml
---
# jinja-lab.yml - Test Jinja2 expressions interactively
- name: Jinja2 expression lab
  hosts: localhost
  connection: local
  gather_facts: false
  vars:
    items:
      - {name: "alpha", score: 85, active: true}
      - {name: "beta", score: 92, active: false}
      - {name: "gamma", score: 78, active: true}
      - {name: "delta", score: 95, active: true}
  tasks:
    - name: Test selectattr filter
      ansible.builtin.debug:
        msg: "Active items: {{ items | selectattr('active') | map(attribute='name') | list }}"

    - name: Test json_query
      ansible.builtin.debug:
        msg: "High scorers: {{ items | json_query('[?score > `90`].name') }}"

    - name: Test combine and default
      ansible.builtin.set_fact:
        merged: "{{ {'a': 1, 'b': 2} | combine({'b': 3, 'c': 4}) }}"

    - name: Show merged result
      ansible.builtin.debug:
        var: merged

    - name: Test regex operations
      ansible.builtin.debug:
        msg: "{{ 'Hello-World-123' | regex_replace('[^a-zA-Z]', '_') }}"
```

Run it in interactive mode and inspect each result:

```bash
ansible-navigator run jinja-lab.yml
```

## Project Configuration for Teams

Share a standard ansible-navigator configuration with your team:

```yaml
# ansible-navigator.yml - Team development configuration
---
ansible-navigator:
  execution-environment:
    image: quay.io/myorg/ee-dev:latest
    pull:
      policy: missing
    volume-mounts:
      - src: "${HOME}/.ssh"
        dest: /home/runner/.ssh
        options: ro
  mode: interactive
  playbook-artifact:
    enable: true
    save-as: "{playbook_dir}/artifacts/{playbook_name}-{time_stamp}.json"
  logging:
    level: warning
    file: /tmp/ansible-navigator.log
  color:
    enable: true
    osc4: true
```

Commit this file to your project repository so everyone uses the same settings.

## Wrapping Up

ansible-navigator transforms playbook development from a trial-and-error process into an interactive exploration. The TUI lets you inspect variables and task output without re-running with different verbosity levels. The artifact replay feature makes debugging collaborative. And the tight integration with Execution Environments means your development environment matches production exactly. If you are still using ansible-playbook for development, switch to ansible-navigator for a week and see the difference.
