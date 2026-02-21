# How to Combine Dictionaries with the combine Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Dictionaries, Filters, Variables, DevOps

Description: Learn how to use the Ansible combine filter to merge dictionaries for building layered configurations, overriding defaults, and aggregating data from multiple sources.

---

Merging dictionaries is something you end up doing constantly in Ansible. You have default settings that need to be overridden by environment-specific values. You have base configurations that get extended with host-specific additions. You have multiple data sources that need to be combined into a single structure. The `combine` filter handles all of these cases, and understanding its behavior is essential for building flexible, layered configuration systems in your playbooks.

## Basic combine Usage

The `combine` filter merges two or more dictionaries. When keys overlap, the rightmost dictionary wins:

```yaml
---
# basic-combine.yml
# Merge two dictionaries together

- hosts: localhost
  vars:
    defaults:
      port: 8080
      workers: 4
      log_level: info
      timeout: 30
      debug: false

    overrides:
      workers: 16
      log_level: warn
      timeout: 60

  tasks:
    # Merge overrides into defaults
    - name: Combine dictionaries
      set_fact:
        config: "{{ defaults | combine(overrides) }}"

    - name: Show merged result
      debug:
        var: config
    # Result:
    # port: 8080         (from defaults, no override)
    # workers: 16        (overridden)
    # log_level: warn    (overridden)
    # timeout: 60        (overridden)
    # debug: false       (from defaults, no override)
```

## Chaining Multiple combine Calls

You can chain `combine` to merge multiple layers of configuration:

```yaml
---
# layered-config.yml
# Build configuration from multiple layers

- hosts: webservers
  vars:
    # Layer 1: Application defaults
    app_defaults:
      port: 8080
      workers: 4
      log_level: info
      max_connections: 100
      ssl_enabled: false
      compression: true

    # Layer 2: Environment-specific overrides
    env_production:
      workers: 16
      log_level: warn
      max_connections: 1000
      ssl_enabled: true

    env_staging:
      workers: 4
      log_level: debug
      max_connections: 50

    # Layer 3: Host-specific overrides
    host_overrides:
      workers: 32
      max_connections: 2000

  tasks:
    # Merge all layers: defaults -> environment -> host-specific
    - name: Build effective configuration for production
      set_fact:
        effective_config: "{{ app_defaults | combine(env_production) | combine(host_overrides) }}"

    - name: Show effective configuration
      debug:
        var: effective_config
    # Result:
    # port: 8080           (from defaults)
    # workers: 32          (from host_overrides)
    # log_level: warn      (from env_production)
    # max_connections: 2000 (from host_overrides)
    # ssl_enabled: true    (from env_production)
    # compression: true    (from defaults)
```

## Recursive Combine for Nested Dictionaries

By default, `combine` does a shallow merge. If both dictionaries have a nested dictionary under the same key, the entire nested dictionary is replaced (not merged). Use `recursive=true` to merge nested dictionaries deeply:

```yaml
---
# recursive-combine.yml
# Deep merge of nested dictionaries

- hosts: localhost
  vars:
    base_config:
      database:
        host: localhost
        port: 5432
        pool:
          min: 2
          max: 10
          timeout: 30
      logging:
        level: info
        format: json
        file: /var/log/app.log

    env_config:
      database:
        host: db-production.example.com
        pool:
          min: 10
          max: 50
      logging:
        level: warn

  tasks:
    # WITHOUT recursive: nested dicts are completely replaced
    - name: Shallow combine (default)
      set_fact:
        shallow_result: "{{ base_config | combine(env_config) }}"

    - name: Show shallow result
      debug:
        var: shallow_result
    # shallow_result.database.pool has ONLY {min: 10, max: 50}
    # The 'timeout: 30' key is LOST because the entire pool dict was replaced
    # shallow_result.database.port is LOST because the entire database dict was replaced

    # WITH recursive: nested dicts are merged at every level
    - name: Recursive combine
      set_fact:
        deep_result: "{{ base_config | combine(env_config, recursive=true) }}"

    - name: Show deep result
      debug:
        var: deep_result
    # deep_result.database.host: db-production.example.com (overridden)
    # deep_result.database.port: 5432 (preserved from base)
    # deep_result.database.pool.min: 10 (overridden)
    # deep_result.database.pool.max: 50 (overridden)
    # deep_result.database.pool.timeout: 30 (preserved from base)
    # deep_result.logging.level: warn (overridden)
    # deep_result.logging.format: json (preserved from base)
    # deep_result.logging.file: /var/log/app.log (preserved from base)
```

This distinction between shallow and recursive combine is one of the most important things to understand. Shallow combine is faster and simpler. Recursive combine is what you usually want when dealing with layered configuration files.

## Combining Multiple Dictionaries in a Loop

When you have a list of dictionaries to merge:

```yaml
---
# loop-combine.yml
# Merge a list of dictionaries into one

- hosts: localhost
  vars:
    config_layers:
      - {port: 8080, workers: 4}
      - {workers: 8, log_level: info}
      - {log_level: debug, timeout: 60}

  tasks:
    # Use a loop to combine all layers
    - name: Initialize config
      set_fact:
        merged_config: {}

    - name: Merge each layer
      set_fact:
        merged_config: "{{ merged_config | combine(item) }}"
      loop: "{{ config_layers }}"

    - name: Show merged result
      debug:
        var: merged_config
    # Result: {port: 8080, workers: 8, log_level: debug, timeout: 60}

    # One-liner alternative using reduce (Ansible 2.11+)
    - name: Merge all layers in one expression
      set_fact:
        merged_oneliner: "{{ config_layers | ansible.builtin.reduce('combine') }}"
```

## Practical Example: Building Docker Compose-Style Configuration

```yaml
---
# docker-config.yml
# Build container configurations by combining base settings with service-specific settings

- hosts: docker_hosts
  vars:
    # Base settings all containers share
    container_defaults:
      restart_policy: always
      log_driver: json-file
      log_options:
        max-size: "10m"
        max-file: "3"
      network: app_network
      labels:
        managed_by: ansible
        environment: "{{ env_name }}"

    # Service-specific settings
    service_configs:
      frontend:
        image: myapp/frontend:latest
        ports: ["3000:3000"]
        environment:
          NODE_ENV: production
          API_URL: http://backend:8080
        labels:
          service_type: web

      backend:
        image: myapp/backend:latest
        ports: ["8080:8080"]
        environment:
          DATABASE_URL: "postgresql://{{ db_host }}:5432/myapp"
          REDIS_URL: "redis://cache:6379"
        labels:
          service_type: api
        memory_limit: 1g

      worker:
        image: myapp/worker:latest
        environment:
          DATABASE_URL: "postgresql://{{ db_host }}:5432/myapp"
          QUEUE_URL: "redis://cache:6379/1"
        labels:
          service_type: worker
        memory_limit: 2g

  tasks:
    # Build the complete configuration for each service by combining defaults with specifics
    - name: Build complete container configuration
      set_fact:
        containers: >-
          {{
            containers | default({}) | combine({
              item.key: container_defaults | combine(item.value, recursive=true)
            })
          }}
      loop: "{{ service_configs | dict2items }}"
      loop_control:
        label: "{{ item.key }}"

    - name: Show complete container configurations
      debug:
        msg: |
          Service: {{ item.key }}
          Image: {{ item.value.image }}
          Network: {{ item.value.network }}
          Restart: {{ item.value.restart_policy }}
          Labels: {{ item.value.labels }}
      loop: "{{ containers | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
```

## Combining with list_merging Option

When dictionaries contain lists, you can control how those lists are merged:

```yaml
---
# list-merging.yml
# Control how lists within dictionaries are handled during combine

- hosts: localhost
  vars:
    base:
      packages:
        - nginx
        - python3
      ports:
        - 80

    extension:
      packages:
        - nodejs
        - npm
      ports:
        - 443
        - 8080

  tasks:
    # Default behavior: lists are replaced entirely
    - name: Combine with default list behavior (replace)
      set_fact:
        replaced: "{{ base | combine(extension) }}"

    - name: Show replaced
      debug:
        var: replaced
    # replaced.packages: [nodejs, npm] (base list is lost)
    # replaced.ports: [443, 8080] (base list is lost)

    # To append lists, you need to handle them explicitly
    - name: Combine with appended lists
      set_fact:
        appended:
          packages: "{{ base.packages + extension.packages }}"
          ports: "{{ base.ports + extension.ports }}"

    - name: Show appended
      debug:
        var: appended
    # appended.packages: [nginx, python3, nodejs, npm]
    # appended.ports: [80, 443, 8080]

    # Using recursive combine with list_merge='append'
    - name: Combine with list_merge append
      set_fact:
        merged: "{{ base | combine(extension, recursive=true, list_merge='append') }}"

    - name: Show merged with append
      debug:
        var: merged
    # merged.packages: [nginx, python3, nodejs, npm]
    # merged.ports: [80, 443, 8080]
```

The `list_merge` parameter accepts:

- `replace` (default): Lists from the second dict replace lists from the first
- `keep`: Lists from the first dict are kept, second dict's lists are ignored
- `append`: Lists are concatenated
- `prepend`: Second dict's list items are prepended
- `append_rp`: Append and remove duplicates
- `prepend_rp`: Prepend and remove duplicates

## Conditional Combining

```yaml
---
# conditional-combine.yml
# Conditionally add sections to a configuration dictionary

- hosts: webservers
  vars:
    base_config:
      app_name: myapp
      port: 8080

    ssl_config:
      ssl_enabled: true
      ssl_cert: /etc/ssl/certs/app.pem
      ssl_key: /etc/ssl/private/app.key

    monitoring_config:
      metrics_enabled: true
      metrics_port: 9090
      metrics_path: /metrics

  tasks:
    - name: Start with base config
      set_fact:
        final_config: "{{ base_config }}"

    - name: Add SSL config if enabled
      set_fact:
        final_config: "{{ final_config | combine(ssl_config) }}"
      when: enable_ssl | default(false) | bool

    - name: Add monitoring config if enabled
      set_fact:
        final_config: "{{ final_config | combine(monitoring_config) }}"
      when: enable_monitoring | default(true) | bool

    - name: Show final configuration
      debug:
        var: final_config
```

## Wrapping Up

The `combine` filter is your primary tool for building layered, overridable configurations in Ansible. Use simple (shallow) combine for flat dictionaries where you want complete key-level replacement. Use `recursive=true` when you have nested structures and want to merge at every depth. Use `list_merge='append'` when you need to accumulate list items rather than replace them. By combining these options, you can build configuration systems that are as simple or as complex as your infrastructure requires, while keeping your playbooks clean and your defaults easily overridable.
