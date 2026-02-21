# How to Debug Loop Variables in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Loops, Troubleshooting

Description: Learn how to debug and inspect loop variables in Ansible using the debug module, verbose mode, loop_control, and variable introspection techniques.

---

Loops in Ansible are powerful but can be frustrating to debug. When a loop does not behave as expected, you need to see what `item` actually contains, what the loop is iterating over, and how registered variables are structured. Ansible provides several tools for this: the `debug` module, verbosity flags, `loop_control`, and type inspection filters.

This post walks through practical debugging techniques for Ansible loops, from basic variable inspection to advanced introspection methods.

## Using the debug Module

The most straightforward way to inspect loop variables is the `debug` module.

```yaml
# debug-loop.yml
# Inspects what item contains during each loop iteration
- name: Debug loop variables
  hosts: localhost
  gather_facts: false
  vars:
    servers:
      - { name: "web-01", ip: "10.0.1.10", role: "web" }
      - { name: "db-01", ip: "10.0.2.10", role: "database" }
      - { name: "cache-01", ip: "10.0.3.10", role: "cache" }
  tasks:
    - name: Show full item contents
      ansible.builtin.debug:
        var: item
      loop: "{{ servers }}"

    - name: Show specific attributes
      ansible.builtin.debug:
        msg: "Name: {{ item.name }}, IP: {{ item.ip }}, Role: {{ item.role }}"
      loop: "{{ servers }}"
```

The `var` parameter prints the entire variable with its type and structure. The `msg` parameter lets you format specific values.

## Inspecting the Loop Input

Before debugging inside the loop, check what the loop is actually receiving.

```yaml
# inspect-input.yml
# Shows the full list that the loop will iterate over
- name: Inspect loop input
  hosts: localhost
  gather_facts: false
  vars:
    raw_data:
      web: { port: 80, ssl: true }
      api: { port: 8080, ssl: false }
      db: { port: 5432, ssl: true }
  tasks:
    - name: Show what dict2items produces
      ansible.builtin.debug:
        msg: "{{ raw_data | dict2items }}"

    - name: Show the type of the loop input
      ansible.builtin.debug:
        msg: "Type: {{ raw_data | dict2items | type_debug }}, Length: {{ raw_data | dict2items | length }}"

    - name: Now loop with confidence
      ansible.builtin.debug:
        msg: "{{ item.key }}: port {{ item.value.port }}"
      loop: "{{ raw_data | dict2items }}"
```

The `type_debug` filter shows you the Python type of a variable, which helps when you are unsure if something is a list, dict, string, or something else.

## Debugging Registered Variables

Registered variables from loops have a specific structure that can be confusing. Here is how to inspect them.

```yaml
# debug-register.yml
# Shows the structure of registered variables from a loop
- name: Debug registered loop results
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Run a command in a loop
      ansible.builtin.command: "echo {{ item }}"
      loop:
        - hello
        - world
        - test
      register: cmd_results
      changed_when: false

    - name: Show the full registered variable structure
      ansible.builtin.debug:
        var: cmd_results

    - name: Show just the results list
      ansible.builtin.debug:
        var: cmd_results.results

    - name: Show each result's key attributes
      ansible.builtin.debug:
        msg: >
          Item: {{ item.item }},
          stdout: {{ item.stdout }},
          rc: {{ item.rc }},
          changed: {{ item.changed }}
      loop: "{{ cmd_results.results }}"
```

The registered variable has this structure:

```yaml
# Structure of a registered variable from a loop
cmd_results:
  changed: true
  msg: "All items completed"
  results:
    - item: "hello"       # The original loop item
      stdout: "hello"     # Command output
      rc: 0               # Return code
      changed: true
      # ... other fields
    - item: "world"
      stdout: "world"
      rc: 0
      changed: true
```

## Using Verbosity Levels

Ansible's `-v` flags control how much output you see.

```bash
# Standard output
ansible-playbook debug-playbook.yml

# Verbose: shows task results
ansible-playbook debug-playbook.yml -v

# More verbose: shows task input parameters
ansible-playbook debug-playbook.yml -vv

# Even more verbose: shows connection details
ansible-playbook debug-playbook.yml -vvv

# Maximum verbosity: shows everything including SSH commands
ansible-playbook debug-playbook.yml -vvvv
```

You can also make debug tasks only appear at specific verbosity levels.

```yaml
# Conditional debug that only shows at -vv or higher
- name: Show detailed loop info (verbose only)
  ansible.builtin.debug:
    var: item
  loop: "{{ complex_data }}"
  when: ansible_verbosity >= 2
```

## Using loop_control for Cleaner Output

When loops dump huge dictionaries to the console, `loop_control.label` helps.

```yaml
# clean-output.yml
# Uses loop_control to show clean labels instead of full data
- name: Deploy configs with clean output
  hosts: all
  become: true
  vars:
    services:
      - name: nginx
        config: { worker_processes: 4, worker_connections: 1024, keepalive: 65 }
        ports: [80, 443]
        ssl_cert: /etc/ssl/certs/nginx.pem
      - name: redis
        config: { maxmemory: "256mb", maxmemory_policy: "allkeys-lru" }
        ports: [6379]
        ssl_cert: null
  tasks:
    - name: Show services (default output is noisy)
      ansible.builtin.debug:
        msg: "Processing {{ item.name }}"
      loop: "{{ services }}"
      # Default output shows the ENTIRE dictionary for each item

    - name: Show services (clean output with label)
      ansible.builtin.debug:
        msg: "Processing {{ item.name }}"
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"
      # Output shows just the name: "ok: [host] => (item=nginx)"
```

## Debugging index_var and loop_var

The `loop_control` parameters `index_var` and `loop_var` are useful for debugging but can also be the source of bugs.

```yaml
# debug-loop-control.yml
# Shows how index_var and loop_var work
- name: Debug loop control variables
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Show index and custom variable name
      ansible.builtin.debug:
        msg: "Index: {{ idx }}, Item: {{ server }}"
      loop:
        - web-01
        - db-01
        - cache-01
      loop_control:
        index_var: idx
        loop_var: server

    - name: Common bug - forgetting loop_var in included tasks
      ansible.builtin.debug:
        msg: |
          If this task were in an included file called from a loop,
          and that outer loop uses 'item', you need loop_var to
          avoid the variable name collision.
```

## Debugging Filter Chains

When filters produce unexpected results, break the chain apart and inspect each step.

```yaml
# debug-filters.yml
# Breaks apart a filter chain to debug each step
- name: Debug a filter chain
  hosts: localhost
  gather_facts: false
  vars:
    raw_data:
      - { name: "app-1", env: "production", healthy: true }
      - { name: "app-2", env: "staging", healthy: false }
      - { name: "app-3", env: "production", healthy: true }
      - { name: "app-4", env: "production", healthy: false }
  tasks:
    - name: "Step 1: Show raw data"
      ansible.builtin.debug:
        msg: "{{ raw_data }}"

    - name: "Step 2: After selectattr for production"
      ansible.builtin.debug:
        msg: "{{ raw_data | selectattr('env', 'equalto', 'production') | list }}"

    - name: "Step 3: After second selectattr for healthy"
      ansible.builtin.debug:
        msg: >-
          {{
            raw_data
            | selectattr('env', 'equalto', 'production')
            | selectattr('healthy', 'equalto', true)
            | list
          }}

    - name: "Step 4: After map to extract names"
      ansible.builtin.debug:
        msg: >-
          {{
            raw_data
            | selectattr('env', 'equalto', 'production')
            | selectattr('healthy', 'equalto', true)
            | map(attribute='name')
            | list
          }}
```

By inspecting the output at each filter stage, you can identify exactly where the data transformation goes wrong.

## Type Checking

Unexpected types are a common source of loop bugs. Use `type_debug` to verify.

```yaml
# type-debug.yml
# Checks variable types to diagnose loop issues
- name: Debug variable types
  hosts: localhost
  gather_facts: false
  vars:
    a_string: "hello"
    a_list: [1, 2, 3]
    a_dict:
      key: value
    a_number: 42
  tasks:
    - name: Show types
      ansible.builtin.debug:
        msg: >
          string={{ a_string | type_debug }},
          list={{ a_list | type_debug }},
          dict={{ a_dict | type_debug }},
          number={{ a_number | type_debug }}
      # Output: string=str, list=list, dict=dict, number=int

    - name: This would fail - trying to loop over a string
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ a_string }}"
      # Error: a_string is a str, not a list
      when: false  # Disabled to prevent error
```

## Debugging with assert

Use `assert` to verify assumptions about your loop data before the loop runs.

```yaml
# assert-debug.yml
# Validates loop data before processing
- name: Validate and then loop
  hosts: localhost
  gather_facts: false
  vars:
    users:
      - { name: "alice", uid: 1001 }
      - { name: "bob", uid: 1002 }
  tasks:
    - name: Validate the loop data
      ansible.builtin.assert:
        that:
          - users is defined
          - users | type_debug == 'list'
          - users | length > 0
          - users | map(attribute='name') | list | length == users | length
        fail_msg: "users variable is invalid"

    - name: Validate each item has required fields
      ansible.builtin.assert:
        that:
          - item.name is defined
          - item.uid is defined
          - item.uid | int > 0
        fail_msg: "Invalid user entry: {{ item }}"
      loop: "{{ users }}"

    - name: Now safely create users
      ansible.builtin.debug:
        msg: "Creating {{ item.name }} with UID {{ item.uid }}"
      loop: "{{ users }}"
```

## Using callback Plugins for Better Output

The `yaml` callback plugin makes debug output much more readable.

```bash
# Set the callback plugin in ansible.cfg
# [defaults]
# stdout_callback = yaml

# Or set it as an environment variable
export ANSIBLE_STDOUT_CALLBACK=yaml
ansible-playbook debug-playbook.yml
```

The YAML callback formats dictionaries and lists with proper indentation instead of cramming everything on one line.

## Summary

Debugging Ansible loops comes down to inspecting the data at each stage. Use `debug` with `var` to see full variable contents, `type_debug` to check types, and `loop_control.label` to keep output readable. When debugging filter chains, break them apart and inspect each step individually. For registered variables, always check the `.results` list structure. Use `assert` to validate your data before loops process it, and use verbosity flags (`-v` through `-vvvv`) for different levels of detail. Setting the YAML callback plugin makes all debug output significantly easier to read.
