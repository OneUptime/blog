# How to Use Default Values for Undefined Variables in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Jinja2, Filters, DevOps

Description: Learn how to use the default filter and other techniques to handle undefined variables gracefully in Ansible playbooks without causing errors.

---

One of the most frustrating errors in Ansible is the dreaded "undefined variable" failure. You write a playbook that works perfectly in your environment, hand it off to someone else, and it crashes because they did not define some variable you assumed would exist. The `default` filter is your primary tool for preventing this, but Ansible provides several other techniques for handling missing variables gracefully. In this post, I will cover all of them with practical examples.

## The default Filter

The `default` filter provides a fallback value when a variable is not defined:

```yaml
---
# default-filter.yml
# Using the default filter to prevent undefined variable errors

- hosts: webservers
  tasks:
    # If app_port is not defined anywhere, use 8080
    - name: Configure application port
      template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
      vars:
        listen_port: "{{ app_port | default(8080) }}"
        log_level: "{{ app_log_level | default('info') }}"
        max_workers: "{{ app_workers | default(4) }}"
        debug_mode: "{{ enable_debug | default(false) }}"

    - name: Show effective configuration
      debug:
        msg: |
          Port: {{ app_port | default(8080) }}
          Log Level: {{ app_log_level | default('info') }}
          Workers: {{ app_workers | default(4) }}
          Debug: {{ enable_debug | default(false) }}
```

## default with Boolean Second Argument

The `default` filter has an optional second parameter. When set to `true`, it also replaces empty strings, `None`, and other falsy values (not just undefined):

```yaml
---
# default-boolean.yml
# Using default(value, true) to also catch empty and falsy values

- hosts: webservers
  vars:
    defined_but_empty: ""
    defined_but_none: null
    defined_with_value: "production"

  tasks:
    # default(value) only catches undefined variables
    - name: Show default behavior with empty string
      debug:
        msg: "{{ defined_but_empty | default('fallback') }}"
      # Output: "" (empty string, because the variable IS defined)

    # default(value, true) also catches empty, None, false, 0
    - name: Show default(value, true) with empty string
      debug:
        msg: "{{ defined_but_empty | default('fallback', true) }}"
      # Output: "fallback" (because empty string is falsy)

    - name: Show default(value, true) with None
      debug:
        msg: "{{ defined_but_none | default('fallback', true) }}"
      # Output: "fallback" (because None is falsy)

    - name: Show default(value, true) with actual value
      debug:
        msg: "{{ defined_with_value | default('fallback', true) }}"
      # Output: "production" (because it has a truthy value)
```

## Chaining Defaults

You can chain multiple defaults to create a fallback hierarchy:

```yaml
---
# chained-defaults.yml
# Try multiple variables in order, falling back through the chain

- hosts: webservers
  tasks:
    # Try host-specific port, then group port, then global default
    - name: Determine application port
      set_fact:
        effective_port: "{{ host_specific_port | default(group_port) | default(global_port) | default(8080) }}"

    # Try environment-specific log level, then role default
    - name: Determine log level
      debug:
        msg: "Log level: {{ env_log_level | default(role_log_level) | default('warn') }}"
```

## Using default with Dictionaries

When accessing nested dictionary keys, each level can be undefined. Use `default` with an empty dict to safely traverse:

```yaml
---
# nested-defaults.yml
# Safely access nested dictionary values that might not exist

- hosts: webservers
  vars:
    # This config might not have all sections
    app_config:
      database:
        host: db.example.com
        port: 5432
      # Note: no 'cache' or 'monitoring' sections

  tasks:
    # Safe access to potentially missing nested keys
    - name: Get database host
      debug:
        msg: "DB Host: {{ app_config.database.host | default('localhost') }}"

    # Accessing a missing section would fail without default
    - name: Get cache host safely
      debug:
        msg: "Cache: {{ (app_config.cache | default({})).host | default('localhost') }}"

    # Alternative using the 'default' at each level
    - name: Get monitoring port safely
      debug:
        msg: "Monitoring: {{ (app_config | default({})).get('monitoring', {}).get('port', 9090) }}"
```

A cleaner approach for deeply nested access:

```yaml
    # Use a variable chain with defaults at each level
    - name: Safe nested access pattern
      set_fact:
        cache_host: >-
          {{
            app_config
            | default({})
            | community.general.json_query('cache.host')
            | default('localhost', true)
          }}
```

## Using default in Templates

The `default` filter is especially useful in Jinja2 templates:

```ini
# templates/app.conf.j2
# Application configuration with sensible defaults

[server]
host = {{ server_host | default('0.0.0.0') }}
port = {{ server_port | default(8080) }}
workers = {{ server_workers | default(ansible_processor_vcpus | default(2)) }}

[database]
host = {{ db_host | default('localhost') }}
port = {{ db_port | default(5432) }}
name = {{ db_name | default('myapp') }}
user = {{ db_user | default('myapp') }}
pool_size = {{ db_pool_size | default(10) }}

[logging]
level = {{ log_level | default('info') }}
format = {{ log_format | default('json') }}
file = {{ log_file | default('/var/log/myapp/app.log') }}

[features]
{% if feature_flags is defined %}
{% for flag, enabled in feature_flags.items() %}
{{ flag }} = {{ enabled | lower }}
{% endfor %}
{% else %}
# No feature flags configured
{% endif %}
```

## Using omit as a Default

The special `omit` value tells Ansible to not pass the parameter at all, as if it was never specified:

```yaml
---
# omit-example.yml
# Using omit to conditionally include module parameters

- hosts: webservers
  become: yes
  tasks:
    # If ssl_cert is not defined, the ssl_certificate parameter is omitted entirely
    - name: Configure nginx
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'
        validate: "{{ nginx_validate_command | default(omit) }}"

    # The user module: only set password if one is provided
    - name: Create application user
      user:
        name: "{{ app_user }}"
        shell: /bin/bash
        password: "{{ app_user_password | default(omit) }}"
        groups: "{{ app_user_groups | default(omit) }}"
        uid: "{{ app_user_uid | default(omit) }}"

    # The apt module: only set update_cache if explicitly requested
    - name: Install packages
      apt:
        name: "{{ packages }}"
        state: present
        update_cache: "{{ update_apt_cache | default(omit) }}"
```

## Checking if a Variable is Defined

Sometimes you need to check for existence rather than providing a default:

```yaml
---
# defined-checks.yml
# Checking variable existence in conditions

- hosts: webservers
  tasks:
    # Only run this task if deploy_version was provided
    - name: Deploy specific version
      include_tasks: deploy.yml
      when: deploy_version is defined

    # Check if a variable is defined AND not empty
    - name: Validate configuration
      assert:
        that:
          - database_host is defined
          - database_host | length > 0
        fail_msg: "database_host must be defined and not empty"

    # Check if a variable is defined and has a specific type
    - name: Validate list variable
      assert:
        that:
          - allowed_ips is defined
          - allowed_ips is iterable
          - allowed_ips | length > 0
        fail_msg: "allowed_ips must be a non-empty list"
      when: firewall_enabled | default(false)
```

## Setting Playbook-Level Error Behavior

You can control how Ansible handles undefined variables globally:

```ini
# ansible.cfg
[defaults]
# Options: error (default), warn, ignore
# "error" stops playbook execution on undefined variables
# "warn" prints a warning but continues
# "ignore" silently uses an empty string

# The safe choice for most environments:
error_on_undefined_vars = true
```

I strongly recommend keeping `error_on_undefined_vars = true` (the default). Use `default` filters explicitly where you want fallback behavior, rather than silently ignoring all undefined variables.

## Real-World Example: Flexible Role with Defaults

Here is a role that uses defaults extensively to be usable across many environments:

```yaml
# roles/app_server/defaults/main.yml
# Every variable used by this role has a sensible default

# Application basics
app_name: myapp
app_user: "{{ app_name }}"
app_group: "{{ app_user }}"
app_version: latest

# Network
app_bind_address: 0.0.0.0
app_port: 8080

# Resources
app_workers: "{{ ansible_processor_vcpus | default(2) }}"
app_memory_limit: "{{ (ansible_memtotal_mb | default(1024) * 0.7) | int }}m"

# Database (optional)
app_database_enabled: true
app_database_host: localhost
app_database_port: 5432
app_database_name: "{{ app_name }}"

# Caching (optional)
app_cache_enabled: false
app_cache_host: localhost
app_cache_port: 6379

# Logging
app_log_level: info
app_log_file: "/var/log/{{ app_name }}/app.log"

# SSL (optional)
app_ssl_enabled: false
app_ssl_cert: ""
app_ssl_key: ""
```

```yaml
# roles/app_server/tasks/main.yml
- name: Deploy application
  debug:
    msg: "Deploying {{ app_name }} v{{ app_version }} on port {{ app_port }}"

- name: Configure database connection
  template:
    src: database.yml.j2
    dest: "/etc/{{ app_name }}/database.yml"
  when: app_database_enabled | bool

- name: Configure cache connection
  template:
    src: cache.yml.j2
    dest: "/etc/{{ app_name }}/cache.yml"
  when: app_cache_enabled | bool

- name: Configure SSL
  include_tasks: ssl.yml
  when: app_ssl_enabled | bool
```

## Wrapping Up

The `default` filter is your first line of defense against undefined variable errors. Use it liberally in templates and task parameters. Use `default(value, true)` when you also want to catch empty strings and None values. Use `omit` when a missing variable should cause a parameter to be excluded entirely. And use `is defined` checks in `when` conditions to control task execution. These techniques together make your playbooks robust and reusable across environments where not every variable is guaranteed to exist.
