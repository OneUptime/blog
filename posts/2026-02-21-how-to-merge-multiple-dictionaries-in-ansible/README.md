# How to Merge Multiple Dictionaries in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Data Transformation, Dictionary, Configuration Management

Description: Learn how to merge multiple dictionaries in Ansible using the combine filter, including recursive merging, precedence control, and practical configuration patterns.

---

When managing infrastructure with Ansible, you often need to merge configuration data from multiple sources. Default settings, environment-specific overrides, and host-level customizations all need to come together into a single dictionary. Ansible's `combine` filter makes this straightforward, but there are several nuances worth understanding.

## Basic Dictionary Merging with combine

The `combine` filter takes one or more dictionaries and merges them together. When keys overlap, the rightmost dictionary wins.

```yaml
# playbook-basic-merge.yml
# Merges default and custom configuration dictionaries
- name: Basic dictionary merge
  hosts: localhost
  gather_facts: false
  vars:
    default_config:
      port: 8080
      log_level: info
      max_connections: 100
      timeout: 30
    custom_config:
      port: 9090
      log_level: debug
      ssl_enabled: true

  tasks:
    - name: Merge default and custom config
      ansible.builtin.set_fact:
        final_config: "{{ default_config | combine(custom_config) }}"

    - name: Display merged configuration
      ansible.builtin.debug:
        var: final_config
```

The result:

```json
{
    "port": 9090,
    "log_level": "debug",
    "max_connections": 100,
    "timeout": 30,
    "ssl_enabled": true
}
```

Notice that `port` and `log_level` were overridden by `custom_config`, while `max_connections` and `timeout` were preserved from `default_config`. The `ssl_enabled` key was added from `custom_config`.

## Merging More Than Two Dictionaries

You can chain multiple dictionaries in a single `combine` call. The merge happens left to right, with later dictionaries taking precedence.

```yaml
# playbook-multi-merge.yml
# Merges three tiers of configuration: defaults, environment, and host-specific
- name: Merge three dictionaries with precedence
  hosts: localhost
  gather_facts: false
  vars:
    defaults:
      port: 80
      workers: 4
      log_level: warning
      cache_ttl: 3600
    environment_config:
      workers: 8
      log_level: info
      environment: production
    host_config:
      workers: 16
      bind_address: "10.0.1.5"

  tasks:
    - name: Merge all three levels
      ansible.builtin.set_fact:
        final: "{{ defaults | combine(environment_config) | combine(host_config) }}"

    - name: Show final merged result
      ansible.builtin.debug:
        var: final
```

You can also pass multiple dictionaries to a single `combine` call:

```yaml
    - name: Same result with single combine call
      ansible.builtin.set_fact:
        final: "{{ defaults | combine(environment_config, host_config) }}"
```

## Merge Precedence Flow

Here is how precedence works when merging multiple dictionaries:

```mermaid
graph LR
    A[defaults] -->|combine| B[+ environment_config]
    B -->|combine| C[+ host_config]
    C --> D[Final merged dictionary]
    style D fill:#2d5,stroke:#333,color:#fff
```

Later dictionaries always override earlier ones for matching keys.

## Recursive (Deep) Merging

By default, `combine` does a shallow merge. If your dictionaries contain nested dictionaries, the inner dictionary from the second operand completely replaces the one in the first. To merge nested dictionaries recursively, pass `recursive=true`.

```yaml
# playbook-recursive-merge.yml
# Demonstrates the difference between shallow and recursive merging
- name: Recursive dictionary merge
  hosts: localhost
  gather_facts: false
  vars:
    base_config:
      database:
        host: localhost
        port: 5432
        pool_size: 5
      logging:
        level: info
        format: json
    override_config:
      database:
        host: db.production.internal
        ssl: true
      logging:
        level: debug

  tasks:
    - name: Shallow merge (default) - nested dicts are replaced entirely
      ansible.builtin.set_fact:
        shallow_result: "{{ base_config | combine(override_config) }}"

    - name: Show shallow merge result
      ansible.builtin.debug:
        var: shallow_result

    - name: Recursive merge - nested dicts are merged key by key
      ansible.builtin.set_fact:
        recursive_result: "{{ base_config | combine(override_config, recursive=true) }}"

    - name: Show recursive merge result
      ansible.builtin.debug:
        var: recursive_result
```

Shallow merge result (note that `port` and `pool_size` are lost):

```json
{
    "database": {"host": "db.production.internal", "ssl": true},
    "logging": {"level": "debug"}
}
```

Recursive merge result (all keys preserved, only conflicting ones overridden):

```json
{
    "database": {"host": "db.production.internal", "port": 5432, "pool_size": 5, "ssl": true},
    "logging": {"level": "debug", "format": "json"}
}
```

## Merging a List of Dictionaries

When you have a list of dictionaries (perhaps loaded from multiple variable files), you can merge them in a loop:

```yaml
# playbook-merge-list.yml
# Merges an arbitrary list of configuration fragments into one dictionary
- name: Merge a list of dictionaries
  hosts: localhost
  gather_facts: false
  vars:
    config_fragments:
      - server_name: myapp
        port: 8080
      - log_level: debug
        log_file: /var/log/myapp.log
      - max_retries: 3
        timeout: 60
      - port: 9090

  tasks:
    - name: Merge all fragments sequentially
      ansible.builtin.set_fact:
        merged_config: "{{ merged_config | default({}) | combine(item) }}"
      loop: "{{ config_fragments }}"

    - name: Display merged config
      ansible.builtin.debug:
        var: merged_config
```

## Conditional Merging

You can conditionally include configuration based on variables or facts:

```yaml
# playbook-conditional-merge.yml
# Conditionally merges SSL config only when SSL is enabled
- name: Conditional dictionary merge
  hosts: localhost
  gather_facts: false
  vars:
    enable_ssl: true
    base_config:
      port: 80
      server_name: myapp.example.com
    ssl_config:
      port: 443
      ssl_certificate: /etc/ssl/certs/myapp.pem
      ssl_key: /etc/ssl/private/myapp.key
      ssl_protocols: "TLSv1.2 TLSv1.3"

  tasks:
    - name: Build config with optional SSL
      ansible.builtin.set_fact:
        final_config: >-
          {{ base_config | combine(ssl_config if enable_ssl else {}) }}

    - name: Show final config
      ansible.builtin.debug:
        var: final_config
```

## Merging with list_merge Control

When using `recursive=true`, you can also control how lists inside the dictionaries are merged using the `list_merge` parameter. Options include `replace` (default), `keep`, `append`, `prepend`, `append_rp`, and `prepend_rp`.

```yaml
# playbook-list-merge.yml
# Shows how list_merge controls the merging behavior for list values
- name: Control list merging behavior
  hosts: localhost
  gather_facts: false
  vars:
    base:
      allowed_ips:
        - 10.0.0.0/8
        - 172.16.0.0/12
      features:
        - logging
        - monitoring
    additions:
      allowed_ips:
        - 192.168.0.0/16
      features:
        - alerting

  tasks:
    - name: Merge with list replacement (default)
      ansible.builtin.debug:
        msg: "{{ base | combine(additions, recursive=true, list_merge='replace') }}"

    - name: Merge with list append
      ansible.builtin.debug:
        msg: "{{ base | combine(additions, recursive=true, list_merge='append') }}"
```

With `replace`, the lists from `additions` overwrite the lists in `base`. With `append`, the lists are concatenated.

## Practical Example: Building Nginx Configuration

```yaml
# playbook-nginx-config.yml
# Assembles a complete Nginx configuration from layered dictionaries
- name: Build Nginx config from layered dictionaries
  hosts: webservers
  vars:
    nginx_defaults:
      worker_processes: auto
      worker_connections: 1024
      server:
        listen: 80
        server_name: "_"
        root: /var/www/html
        index: index.html
    nginx_env:
      server:
        server_name: "app.example.com"
        root: /opt/app/public
    nginx_host:
      worker_connections: 4096

  tasks:
    - name: Merge all Nginx config layers
      ansible.builtin.set_fact:
        nginx_config: >-
          {{ nginx_defaults |
             combine(nginx_env, recursive=true) |
             combine(nginx_host) }}

    - name: Write Nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Reload Nginx
```

## Key Points

Use `combine` for straightforward merging, and always remember that later dictionaries override earlier ones. Turn on `recursive=true` when you need nested dictionaries to be merged key-by-key rather than replaced wholesale. For lists of dictionaries, use a loop with `default({})` as the initial value. And when your nested structures contain lists, reach for the `list_merge` parameter to control whether lists are replaced, appended, or prepended.
