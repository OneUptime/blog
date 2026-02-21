# How to Use the combine Filter for Merging Dictionaries in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Dictionaries, Configuration Management, DevOps

Description: Learn how to merge dictionaries in Ansible using the combine filter to override defaults, layer configurations, and build dynamic variable structures.

---

Dictionaries are the backbone of Ansible variables. Almost every piece of configuration data ends up as a dictionary at some point, whether it is a service configuration, a set of environment variables, or connection parameters. The `combine` filter lets you merge two or more dictionaries together, with later values overriding earlier ones when keys overlap.

This is one of the most practically useful filters in Ansible, and understanding how it works will save you from writing complex variable inheritance logic by hand.

## Basic Usage

```yaml
# Merge two dictionaries - second dict overrides first on conflicts
- name: Basic combine example
  ansible.builtin.debug:
    msg: "{{ dict_a | combine(dict_b) }}"
  vars:
    dict_a:
      name: myapp
      port: 8080
      debug: false
    dict_b:
      port: 9090
      log_level: info
```

Output:
```json
{"name": "myapp", "port": 9090, "debug": false, "log_level": "info"}
```

The `port` key from `dict_b` (9090) overrides the one from `dict_a` (8080). Keys unique to each dictionary are preserved in the result.

## The Override Rule

The last dictionary wins. When you combine multiple dictionaries, the rightmost value for any given key takes precedence:

```yaml
# Later dictionaries override earlier ones
- name: Multiple combine
  ansible.builtin.debug:
    msg: "{{ defaults | combine(group_config) | combine(host_config) }}"
  vars:
    defaults:
      port: 80
      workers: 4
      debug: false
      log_level: warn
    group_config:
      workers: 8
      log_level: info
    host_config:
      debug: true
```

Output: `{"port": 80, "workers": 8, "debug": true, "log_level": "info"}`

This layered override pattern mirrors how most configuration systems work: you set defaults, then override with environment-specific values, then override with host-specific values.

## Practical Example: Layered Application Config

This is the pattern I use most frequently. Define default configuration, then let each environment and host layer overrides on top:

```yaml
# roles/webapp/defaults/main.yml
webapp_defaults:
  listen_address: 0.0.0.0
  port: 8080
  workers: 4
  max_connections: 1000
  log_level: warn
  debug: false
  session_timeout: 3600
  cors_enabled: false
```

```yaml
# group_vars/production.yml
webapp_overrides:
  workers: 16
  max_connections: 10000
  log_level: error
```

```yaml
# host_vars/web01.yml
webapp_host_overrides:
  debug: true
  log_level: debug
```

```yaml
# roles/webapp/tasks/main.yml
- name: Build final configuration
  ansible.builtin.set_fact:
    webapp_config: >-
      {{ webapp_defaults
         | combine(webapp_overrides | default({}))
         | combine(webapp_host_overrides | default({})) }}

- name: Deploy application config
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/webapp/app.conf
```

The template:

```jinja2
{# templates/app.conf.j2 - Application config from merged dictionaries #}
# Application Configuration - Managed by Ansible
{% for key, value in webapp_config.items() | sort %}
{{ key }} = {{ value }}
{% endfor %}
```

## Recursive Combine

By default, `combine` does a shallow merge. Nested dictionaries are completely replaced, not merged. To merge nested structures, use `recursive=true`:

```yaml
# Shallow combine replaces nested dicts entirely
- name: Shallow combine (default)
  ansible.builtin.debug:
    msg: "{{ base | combine(override) }}"
  vars:
    base:
      database:
        host: localhost
        port: 5432
        name: mydb
        pool_size: 10
    override:
      database:
        host: db.production.internal
```

Output (shallow): `{"database": {"host": "db.production.internal"}}`

The entire `database` dictionary gets replaced. Pool size, port, and name are lost.

Now with recursive combine:

```yaml
# Recursive combine merges nested dicts
- name: Recursive combine
  ansible.builtin.debug:
    msg: "{{ base | combine(override, recursive=true) }}"
  vars:
    base:
      database:
        host: localhost
        port: 5432
        name: mydb
        pool_size: 10
    override:
      database:
        host: db.production.internal
```

Output (recursive): `{"database": {"host": "db.production.internal", "port": 5432, "name": "mydb", "pool_size": 10}}`

Only the `host` key is overridden. Everything else is preserved.

## When to Use Recursive vs Shallow

Use recursive combine when you have deeply nested config structures and want to override just specific leaves:

```yaml
# Recursive is essential for complex nested configs
- name: Merge complex application settings
  ansible.builtin.set_fact:
    app_settings: "{{ app_defaults | combine(app_env_settings, recursive=true) }}"
  vars:
    app_defaults:
      server:
        host: 0.0.0.0
        port: 3000
        ssl:
          enabled: false
          cert_path: ""
          key_path: ""
      cache:
        backend: memory
        ttl: 300
      logging:
        level: info
        format: json
        outputs:
          - stdout
    app_env_settings:
      server:
        ssl:
          enabled: true
          cert_path: /etc/ssl/app.crt
          key_path: /etc/ssl/app.key
      cache:
        backend: redis
        host: cache.internal
```

With recursive combine, you get the full merged structure. Without it, the `server` key would lose its `host` and `port` values.

## Building Dynamic Dictionaries in Loops

You can use combine inside a loop to build up a dictionary incrementally:

```yaml
# Build a dictionary from a list using combine in a loop
- name: Build user configuration map
  ansible.builtin.set_fact:
    user_configs: "{{ user_configs | default({}) | combine({item.name: item.config}) }}"
  loop:
    - name: alice
      config:
        shell: /bin/zsh
        groups: [admin, developers]
    - name: bob
      config:
        shell: /bin/bash
        groups: [developers]
    - name: charlie
      config:
        shell: /bin/bash
        groups: [viewers]

- name: Show result
  ansible.builtin.debug:
    msg: "{{ user_configs }}"
```

This builds a dictionary keyed by username, which is much easier to look up later than iterating over a list.

## Combining with Environment Variables

A practical pattern for building environment variable dictionaries:

```yaml
# Merge base environment variables with app-specific ones
- name: Deploy container with merged environment
  community.docker.docker_container:
    name: myapp
    image: myapp:latest
    env: "{{ base_env | combine(app_env) | combine(secret_env) }}"
  vars:
    base_env:
      TZ: UTC
      LANG: en_US.UTF-8
      NODE_ENV: production
    app_env:
      APP_PORT: "3000"
      DB_HOST: db.internal
      REDIS_URL: redis://cache.internal:6379
    secret_env:
      DB_PASSWORD: "{{ vault_db_password }}"
      API_KEY: "{{ vault_api_key }}"
```

## Combining Lists of Dictionaries

If you have a list of dictionaries to merge, use a loop or the `reduce` pattern:

```yaml
# Merge a list of dictionaries into one using a loop
- name: Merge all config layers
  ansible.builtin.set_fact:
    merged: "{{ merged | default({}) | combine(item, recursive=true) }}"
  loop: "{{ config_layers }}"
  vars:
    config_layers:
      - { a: 1, b: 2 }
      - { b: 3, c: 4 }
      - { c: 5, d: 6 }

# Result: {a: 1, b: 3, c: 5, d: 6}
```

## Using combine in Templates

```jinja2
{# templates/docker-compose.yml.j2 - Merge service defaults with overrides #}
version: "3.8"
services:
{% for name, override in service_overrides.items() %}
{% set svc = service_defaults | combine(override, recursive=true) %}
  {{ name }}:
    image: {{ svc.image }}
    ports:
{% for port in svc.ports %}
      - "{{ port }}"
{% endfor %}
    environment:
{% for key, value in svc.environment.items() | sort %}
      {{ key }}: "{{ value }}"
{% endfor %}
{% endfor %}
```

## Summary

The `combine` filter is essential for building layered configuration in Ansible. Use it to implement the defaults-plus-overrides pattern that most infrastructure needs: set sensible defaults, then layer on environment-specific settings, then host-specific tweaks. Remember the key points: the last dictionary wins, use `recursive=true` for nested structures, and use `default({})` when combining with potentially undefined variables. This filter turns messy variable inheritance into clean, predictable configuration merging.
