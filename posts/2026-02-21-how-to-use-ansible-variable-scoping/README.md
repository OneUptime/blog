# How to Use Ansible Variable Scoping (Play, Block, Task, Role)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Scoping, Best Practices

Description: Understand Ansible variable scoping rules across play, block, task, and role levels to avoid unexpected behavior and write predictable playbooks.

---

Variable scoping in Ansible is one of those topics that bites you when you least expect it. A variable that works perfectly in one task suddenly has a different value in another. Or a role overrides a variable you set explicitly. Understanding how Ansible scopes variables across plays, blocks, tasks, and roles is essential for writing predictable, debuggable automation.

## The Three Scopes

Ansible has three variable scopes:

1. **Global scope** - variables set by the command line (`-e`), configuration, or environment. Available everywhere.
2. **Play scope** - variables set in a play (`vars`, `vars_files`, `vars_prompt`, facts). Available to all tasks in the play.
3. **Host scope** - variables associated with a specific host (`set_fact`, `register`, inventory variables). Available wherever that host is referenced.

There is no task-level scope in the traditional sense. Variables set in a task are actually host-scoped, meaning they persist beyond the task that created them.

## Play-Level Variables

Variables defined in the `vars` section of a play are available to all tasks, handlers, and templates within that play. They do not carry over to other plays in the same playbook.

```yaml
# play-scope.yml
# Demonstrates play-level variable scoping
---
- name: First play
  hosts: all
  vars:
    message: "Hello from play 1"
    app_port: 8080
  tasks:
    - name: Show play 1 variables
      ansible.builtin.debug:
        msg: "{{ message }} on port {{ app_port }}"

- name: Second play
  hosts: all
  tasks:
    - name: Try to use play 1 variables
      ansible.builtin.debug:
        msg: "{{ message | default('NOT DEFINED') }}"
      # Output: NOT DEFINED - play 1 vars are not in scope
```

Each play is an independent scope. Variables from one play do not leak into another.

## Block-Level Variables

Blocks can have their own `vars` section. These variables are available only within the block.

```yaml
# block-scope.yml
# Shows block-level variable scoping
---
- name: Block variable scoping
  hosts: all
  vars:
    global_var: "play-level value"
  tasks:
    - name: Task before block
      ansible.builtin.debug:
        msg: "block_var is {{ block_var | default('NOT DEFINED') }}"

    - name: Block with local variables
      vars:
        block_var: "defined in block"
        global_var: "overridden in block"
      block:
        - name: Inside block - access block var
          ansible.builtin.debug:
            msg: "block_var: {{ block_var }}, global_var: {{ global_var }}"
          # Output: block_var: defined in block, global_var: overridden in block

        - name: Still inside block
          ansible.builtin.debug:
            msg: "block_var still available: {{ block_var }}"

    - name: Task after block
      ansible.builtin.debug:
        msg: "block_var: {{ block_var | default('NOT DEFINED') }}, global_var: {{ global_var }}"
      # block_var is NOT DEFINED outside the block
      # global_var is back to "play-level value"
```

Block variables create a contained scope. The overridden `global_var` reverts to its play-level value after the block ends.

## Task-Level Variables

You can set variables at the task level using the `vars` keyword. These are only available during that specific task.

```yaml
# task-scope.yml
# Shows task-level variable scoping
---
- name: Task variable scoping
  hosts: all
  vars:
    shared_var: "play value"
  tasks:
    - name: Task with local variable
      ansible.builtin.debug:
        msg: "local_var: {{ local_var }}, shared_var: {{ shared_var }}"
      vars:
        local_var: "task-only value"
        shared_var: "task override"
      # Output: local_var: task-only value, shared_var: task override

    - name: Next task
      ansible.builtin.debug:
        msg: "local_var: {{ local_var | default('NOT DEFINED') }}, shared_var: {{ shared_var }}"
      # Output: local_var: NOT DEFINED, shared_var: play value
```

## Host-Scoped Variables (set_fact and register)

Variables created by `set_fact` and `register` are host-scoped. They persist for the entire playbook run for that specific host, crossing play boundaries.

```yaml
# host-scope.yml
# Shows that set_fact and register create host-scoped variables
---
- name: First play - set host variables
  hosts: all
  tasks:
    - name: Register a command result
      ansible.builtin.command: hostname
      register: hostname_result
      changed_when: false

    - name: Set a fact
      ansible.builtin.set_fact:
        my_custom_fact: "set in play 1"

- name: Second play - host vars persist
  hosts: all
  tasks:
    - name: Access variables from play 1
      ansible.builtin.debug:
        msg:
          - "Hostname result: {{ hostname_result.stdout }}"
          - "Custom fact: {{ my_custom_fact }}"
      # Both are available because they are host-scoped
```

This is one of the most important scoping rules to understand. Unlike play-level `vars`, facts set with `set_fact` survive across plays.

## Role Variable Scoping

Roles have their own variable hierarchy with `defaults` and `vars` directories. Understanding precedence here is critical.

```yaml
# roles/myapp/defaults/main.yml
# Low-priority defaults - easily overridden
app_port: 8080
log_level: info
workers: 4

# roles/myapp/vars/main.yml
# High-priority vars - harder to override
internal_config_path: /etc/myapp
internal_log_path: /var/log/myapp
```

```yaml
# use-role.yml
# Shows how role variables interact with play variables
---
- name: Role variable scoping
  hosts: all
  vars:
    app_port: 9090    # This overrides the role default
    # internal_config_path: /custom/path  # This would NOT override role vars
  roles:
    - role: myapp

  tasks:
    - name: Show which values won
      ansible.builtin.debug:
        msg:
          - "app_port: {{ app_port }}"
          # Will be 9090 - play vars override role defaults
          - "log_level: {{ log_level }}"
          # Will be info - role default, not overridden
          - "internal_config_path: {{ internal_config_path }}"
          # Will be /etc/myapp - role vars are high priority
```

The precedence order (simplified) from lowest to highest:

1. Role defaults (`roles/x/defaults/main.yml`)
2. Inventory variables
3. Play `vars`
4. Play `vars_files`
5. Role `vars` (`roles/x/vars/main.yml`)
6. Block vars
7. Task vars
8. `set_fact` / `register`
9. Extra vars (`-e`)

## include_role vs import_role Scoping

The way you include a role affects variable scoping.

```yaml
# include-vs-import.yml
# Shows scoping differences between include_role and import_role
---
- name: Role inclusion scoping
  hosts: all
  tasks:
    # import_role - vars are available to subsequent tasks
    - name: Import a role
      ansible.builtin.import_role:
        name: setup_base
      vars:
        base_port: 8080

    # Tasks after import_role can access role variables
    - name: Use variable from imported role
      ansible.builtin.debug:
        msg: "Base port: {{ base_port | default('NOT AVAILABLE') }}"

    # include_role - vars are scoped to the role
    - name: Include a role
      ansible.builtin.include_role:
        name: setup_app
      vars:
        app_port: 9090

    # Variables from include_role may not be available here
    - name: Try to use variable from included role
      ansible.builtin.debug:
        msg: "App port: {{ app_port | default('NOT AVAILABLE') }}"
```

`import_role` is processed at parse time, and its variables merge into the play scope. `include_role` is processed at runtime and has more isolated scoping.

## Variable Precedence in Practice

Here is a practical example showing how multiple sources interact.

```yaml
# precedence-demo.yml
# Demonstrates variable precedence across sources
---
- name: Variable precedence demo
  hosts: web-01
  vars:
    my_var: "from play vars"
  vars_files:
    - vars/config.yml  # Contains: my_var: "from vars_files"
  tasks:
    - name: Show value of my_var
      ansible.builtin.debug:
        msg: "my_var = {{ my_var }}"
      # Value is "from vars_files" because vars_files > vars

    - name: Override with set_fact
      ansible.builtin.set_fact:
        my_var: "from set_fact"

    - name: Show value after set_fact
      ansible.builtin.debug:
        msg: "my_var = {{ my_var }}"
      # Value is "from set_fact" because set_fact > vars_files

    - name: Task-level override
      ansible.builtin.debug:
        msg: "my_var = {{ my_var }}"
      vars:
        my_var: "from task vars"
      # Value is "from task vars" for this task only
      # But this is complicated - see note below
```

## Debugging Variable Scoping Issues

When variables have unexpected values, these techniques help.

```yaml
# debug-scoping.yml
# Techniques for debugging variable scoping issues
---
- name: Debug variable scoping
  hosts: all
  tasks:
    - name: Show where a variable comes from
      ansible.builtin.debug:
        msg: "{{ lookup('vars', 'my_var', default='UNDEFINED') }}"

    - name: Show all variables for this host
      ansible.builtin.debug:
        var: vars
      # Warning: this outputs a LOT of data

    - name: Show specific variable with type
      ansible.builtin.debug:
        msg:
          - "Value: {{ my_var | default('UNDEFINED') }}"
          - "Type: {{ my_var | default('') | type_debug }}"

    - name: Show hostvars for debugging
      ansible.builtin.debug:
        msg: "{{ hostvars[inventory_hostname].keys() | sort | list }}"
```

## Best Practices for Variable Scoping

```yaml
# best-practices.yml
# Demonstrates clean variable scoping patterns
---
- name: Clean scoping practices
  hosts: all
  vars:
    # Use descriptive names to avoid collisions
    app_nginx_port: 80        # Good: prefixed
    # port: 80                 # Bad: too generic, will collide

  tasks:
    # Use block vars for temporary overrides
    - name: Temporary configuration block
      vars:
        temp_config_path: /tmp/test-config
      block:
        - name: Test configuration
          ansible.builtin.template:
            src: config.j2
            dest: "{{ temp_config_path }}/test.conf"

        - name: Validate configuration
          ansible.builtin.command: "check-config {{ temp_config_path }}/test.conf"

    # Use set_fact sparingly - it persists
    - name: Only use set_fact when you need cross-play persistence
      ansible.builtin.set_fact:
        deployment_timestamp: "{{ ansible_date_time.iso8601 }}"
      # This fact persists across plays for this host
```

## Summary

Ansible variable scoping has three levels: global (extra vars), play (vars, vars_files), and host (set_fact, register, inventory). Play vars stay within the play. Block and task vars stay within their scope. Host vars (set_fact, register) persist for the entire playbook run. Role defaults are the lowest priority, while extra vars are the highest. When debugging, check the variable precedence order and use the debug module to inspect actual values. Keeping variable names descriptive and scoped appropriately prevents the most common issues with Ansible variable resolution.
