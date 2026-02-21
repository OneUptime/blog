# How to Use the Ansible vars Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Variables, Dynamic Playbooks

Description: Learn how to use the Ansible vars lookup plugin to dynamically resolve variable names at runtime and build flexible, data-driven playbooks.

---

Most of the time, you reference Ansible variables directly by name: `{{ my_variable }}`. But sometimes you need to construct a variable name dynamically at runtime and then look up its value. The `vars` lookup plugin takes a variable name as a string and returns its value. This enables patterns like computing a variable name from other variables and resolving it, which is something you cannot do with plain Jinja2 variable references.

## What the vars Lookup Does

The `vars` lookup plugin takes one or more variable names as strings and returns their values. The key difference from regular variable access is that the name itself can be dynamic. You can build the variable name from other variables, facts, or computed strings.

## Basic Usage

The simplest usage looks up a variable by its name.

This playbook demonstrates basic variable resolution:

```yaml
# playbook.yml - Basic vars lookup usage
---
- name: Resolve variables dynamically
  hosts: localhost
  vars:
    greeting_english: "Hello"
    greeting_spanish: "Hola"
    greeting_french: "Bonjour"
    language: "spanish"
  tasks:
    - name: Get greeting in configured language
      ansible.builtin.debug:
        msg: "{{ lookup('vars', 'greeting_' + language) }}"
```

This outputs `Hola` because it constructs the variable name `greeting_spanish` from the prefix `greeting_` and the value of the `language` variable, then resolves it.

## Dynamic Variable Names from Facts

One of the most useful patterns is constructing variable names from host facts.

This playbook loads OS-specific settings without using `include_vars` or `first_found`:

```yaml
# playbook.yml - OS-specific variable resolution
---
- name: Configure package management per OS
  hosts: all
  vars:
    pkg_manager_Ubuntu: apt
    pkg_manager_CentOS: yum
    pkg_manager_Rocky: dnf
    pkg_manager_Debian: apt

    update_cmd_apt: "apt-get update && apt-get upgrade -y"
    update_cmd_yum: "yum update -y"
    update_cmd_dnf: "dnf update -y"
  tasks:
    - name: Resolve package manager for this host
      ansible.builtin.set_fact:
        host_pkg_manager: "{{ lookup('vars', 'pkg_manager_' + ansible_distribution) }}"

    - name: Show the package manager for this host
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} uses {{ host_pkg_manager }}"

    - name: Run the update command for this OS
      ansible.builtin.shell:
        cmd: "{{ lookup('vars', 'update_cmd_' + host_pkg_manager) }}"
      become: true
      when: run_updates | default(false) | bool
```

## Default Values

When the variable might not exist, provide a default to avoid failures.

```yaml
# playbook.yml - vars lookup with defaults
---
- name: Safe variable resolution
  hosts: all
  vars:
    config_production: "strict"
    config_staging: "moderate"
    # config_development is intentionally not defined
  tasks:
    - name: Get environment config with fallback
      ansible.builtin.set_fact:
        env_config: "{{ lookup('vars', 'config_' + target_env, default='permissive') }}"
      vars:
        target_env: "{{ deploy_env | default('development') }}"

    - name: Show resolved config
      ansible.builtin.debug:
        msg: "Running in {{ deploy_env | default('development') }} mode: {{ env_config }}"
```

## Practical Example: Per-Host Configuration

When you have per-host settings defined as separate variables, `vars` lets you select the right one dynamically.

```yaml
# group_vars/all.yml
---
host_config_web01:
  role: frontend
  port: 80
  workers: 8

host_config_web02:
  role: frontend
  port: 80
  workers: 4

host_config_api01:
  role: backend
  port: 9090
  workers: 16

host_config_db01:
  role: database
  port: 5432
  workers: 0
```

```yaml
# playbook.yml - Resolve per-host configuration dynamically
---
- name: Apply per-host configuration
  hosts: all
  tasks:
    - name: Get this host's configuration
      ansible.builtin.set_fact:
        my_config: "{{ lookup('vars', 'host_config_' + inventory_hostname | regex_replace('[^a-zA-Z0-9]', '_'), default={}) }}"

    - name: Deploy configuration
      ansible.builtin.template:
        src: "app_{{ my_config.role }}.conf.j2"
        dest: /etc/myapp/config.conf
        mode: '0644'
      when: my_config | length > 0

    - name: Skip hosts without configuration
      ansible.builtin.debug:
        msg: "No specific configuration found for {{ inventory_hostname }}"
      when: my_config | length == 0
```

## Multi-Environment Deployment

The `vars` lookup is excellent for managing settings across multiple environments.

```yaml
# playbook.yml - Multi-environment deployment with vars lookup
---
- name: Environment-aware deployment
  hosts: all
  vars:
    env: "{{ target_env | default('staging') }}"

    # Database settings per environment
    db_host_production: "prod-db.internal.example.com"
    db_host_staging: "staging-db.internal.example.com"
    db_host_development: "localhost"

    db_replicas_production: 3
    db_replicas_staging: 1
    db_replicas_development: 0

    db_pool_size_production: 50
    db_pool_size_staging: 10
    db_pool_size_development: 5
  tasks:
    - name: Resolve database settings for current environment
      ansible.builtin.set_fact:
        db_host: "{{ lookup('vars', 'db_host_' + env) }}"
        db_replicas: "{{ lookup('vars', 'db_replicas_' + env) }}"
        db_pool_size: "{{ lookup('vars', 'db_pool_size_' + env) }}"

    - name: Display resolved configuration
      ansible.builtin.debug:
        msg: |
          Environment: {{ env }}
          DB Host: {{ db_host }}
          DB Replicas: {{ db_replicas }}
          DB Pool Size: {{ db_pool_size }}

    - name: Template database configuration
      ansible.builtin.template:
        src: database.conf.j2
        dest: /etc/myapp/database.conf
        mode: '0644'
```

## Iterating Over Dynamic Variables

You can combine `vars` with loops to resolve multiple dynamically named variables.

```yaml
# playbook.yml - Resolve multiple variables in a loop
---
- name: Process multiple dynamic variables
  hosts: localhost
  vars:
    service_list:
      - web
      - api
      - worker

    port_web: 80
    port_api: 9090
    port_worker: 5555

    health_check_web: "/health"
    health_check_api: "/api/health"
    health_check_worker: "/status"
  tasks:
    - name: Build service configuration from dynamic variables
      ansible.builtin.set_fact:
        service_configs: "{{ service_configs | default([]) + [{'name': item, 'port': lookup('vars', 'port_' + item), 'health_check': lookup('vars', 'health_check_' + item)}] }}"
      loop: "{{ service_list }}"

    - name: Display service configurations
      ansible.builtin.debug:
        msg: "{{ item.name }}: port={{ item.port }}, health={{ item.health_check }}"
      loop: "{{ service_configs }}"
```

## Combining varnames and vars

The `varnames` lookup finds variable names by pattern, and `vars` resolves their values. Together, they create a powerful discovery mechanism.

```yaml
# playbook.yml - Discover and resolve variables dynamically
---
- name: Auto-discover and configure monitoring endpoints
  hosts: localhost
  vars:
    monitor_endpoint_app: "http://localhost:8080/health"
    monitor_endpoint_api: "http://localhost:9090/health"
    monitor_endpoint_db: "tcp://localhost:5432"
    monitor_endpoint_cache: "tcp://localhost:6379"
    monitor_interval_default: 30
  tasks:
    - name: Find all monitoring endpoints
      ansible.builtin.set_fact:
        endpoint_var_names: "{{ lookup('varnames', 'monitor_endpoint_.*', wantlist=True) }}"

    - name: Build monitoring configuration
      ansible.builtin.set_fact:
        monitoring_targets: "{{ monitoring_targets | default([]) + [{'name': item | regex_replace('^monitor_endpoint_', ''), 'url': lookup('vars', item)}] }}"
      loop: "{{ endpoint_var_names }}"

    - name: Generate monitoring config
      ansible.builtin.copy:
        content: |
          # Auto-discovered monitoring targets
          {% for target in monitoring_targets %}
          [[target]]
          name = "{{ target.name }}"
          url = "{{ target.url }}"
          interval = {{ monitor_interval_default }}
          {% endfor %}
        dest: /etc/monitoring/targets.toml
        mode: '0644'
```

## Looking Up Multiple Variables at Once

The `vars` lookup can resolve multiple variable names in a single call.

```yaml
# playbook.yml - Resolve multiple variables at once
---
- name: Resolve multiple variables
  hosts: localhost
  vars:
    var_a: "value_a"
    var_b: "value_b"
    var_c: "value_c"
  tasks:
    - name: Get multiple variable values
      ansible.builtin.debug:
        msg: "{{ lookup('vars', 'var_a', 'var_b', 'var_c') }}"
```

Note: When passing multiple names, the result is a comma-separated string of values. Use `wantlist=True` to get a proper list.

## Error Handling

When the referenced variable does not exist, the lookup fails by default. Always plan for missing variables.

```yaml
# playbook.yml - Handle missing variables
---
- name: Safe variable resolution patterns
  hosts: all
  tasks:
    # Pattern 1: Default value
    - name: With default
      ansible.builtin.set_fact:
        value: "{{ lookup('vars', 'maybe_undefined_var', default='safe_default') }}"

    # Pattern 2: Check existence first
    - name: Check if variable exists before using it
      ansible.builtin.set_fact:
        value: "{{ lookup('vars', dynamic_var_name) }}"
      when: dynamic_var_name in (lookup('varnames', '.*', wantlist=True))
      vars:
        dynamic_var_name: "config_{{ inventory_hostname }}"
```

## Tips and Common Mistakes

1. **String vs variable**: The argument to `vars` lookup must be a string containing the variable name, not the variable itself. `lookup('vars', 'my_var')` is correct. `lookup('vars', my_var)` looks up the value of whatever `my_var` contains as a variable name.

2. **Use defaults liberally**: Dynamically constructed variable names are prone to typos and missing definitions. Always provide a `default` parameter.

3. **Naming conventions matter**: This pattern works best when you establish clear, consistent naming conventions for your variables. Without consistency, the dynamic resolution becomes fragile.

4. **Debugging**: When things do not resolve as expected, add a debug task that prints the constructed variable name before the lookup. Often the name is not what you think it is.

5. **Prefer simpler approaches**: If you can use a dictionary instead of multiple flat variables, a dictionary with bracket notation (`my_dict[key]`) is simpler and more readable than `lookup('vars', 'my_prefix_' + key)`. Use `vars` lookup when you cannot control the variable structure.

The `vars` lookup plugin unlocks a level of dynamism that regular Jinja2 variable references cannot achieve. It is the tool you reach for when variable names themselves need to be computed, enabling convention-driven automation patterns that scale well across large, diverse infrastructure.
