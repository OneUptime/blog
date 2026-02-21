# How to Use the extract Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Data Extraction, Automation, Jinja2

Description: Learn how to use the extract filter in Ansible to pull values from lists and dictionaries by index or key for targeted data retrieval.

---

The `extract` filter in Ansible lets you pull specific values out of a list or dictionary using indices or keys. It is particularly useful when you have a list of keys or indices and want to extract the corresponding values from a data structure. Think of it as a programmatic way to do lookups without writing explicit loops.

While it is not the most commonly discussed filter, it becomes invaluable when you need to map between different data structures or selectively pull data based on computed indices.

## Basic Dictionary Extraction

At its simplest, `extract` pulls a value from a dictionary by key:

```yaml
# Extract a value from a dictionary using a key
- name: Extract single value
  ansible.builtin.debug:
    msg: "{{ 'port' | extract(config) }}"
  vars:
    config:
      host: 10.0.1.10
      port: 8080
      protocol: https
```

Output: `8080`

But the real power comes when you use it with `map` to extract multiple values at once.

## Extracting Multiple Values with map

When combined with `map`, `extract` can pull multiple values from a dictionary or list in one shot:

```yaml
# Extract multiple values from a dictionary using a list of keys
- name: Extract selected config values
  ansible.builtin.debug:
    msg: "{{ keys_to_extract | map('extract', config) | list }}"
  vars:
    config:
      host: 10.0.1.10
      port: 8080
      protocol: https
      timeout: 30
      retries: 3
    keys_to_extract:
      - host
      - port
      - protocol
```

Output: `['10.0.1.10', 8080, 'https']`

This extracts only the `host`, `port`, and `protocol` values, ignoring `timeout` and `retries`.

## List Extraction by Index

The extract filter works with lists too, using indices instead of keys:

```yaml
# Extract values from a list by index positions
- name: Extract by indices
  ansible.builtin.debug:
    msg: "{{ indices | map('extract', servers) | list }}"
  vars:
    servers:
      - web01
      - web02
      - db01
      - cache01
      - worker01
    indices: [0, 2, 4]
```

Output: `['web01', 'db01', 'worker01']`

## Nested Extraction

You can extract nested values by passing additional arguments:

```yaml
# Extract nested values from a list of dictionaries
- name: Extract nested values
  ansible.builtin.debug:
    msg: "{{ [0, 1, 2] | map('extract', servers, 'ip') | list }}"
  vars:
    servers:
      - name: web01
        ip: 10.0.1.10
      - name: db01
        ip: 10.0.2.10
      - name: cache01
        ip: 10.0.3.10
```

Output: `['10.0.1.10', '10.0.2.10', '10.0.3.10']`

The second argument to extract specifies which attribute to pull from each extracted item.

## Practical Example: Host-to-IP Mapping

Suppose you have a dictionary mapping hostnames to configurations and you want to pull just the IPs for a subset of hosts:

```yaml
# Look up IP addresses for specific hosts from a configuration map
- name: Define infrastructure map
  ansible.builtin.set_fact:
    infra_map:
      web01:
        ip: 10.0.1.10
        role: frontend
      web02:
        ip: 10.0.1.11
        role: frontend
      db01:
        ip: 10.0.2.10
        role: database
      cache01:
        ip: 10.0.3.10
        role: cache

- name: Get IPs for specific hosts
  ansible.builtin.debug:
    msg: "{{ target_hosts | map('extract', infra_map, 'ip') | list }}"
  vars:
    target_hosts:
      - web01
      - db01
```

Output: `['10.0.1.10', '10.0.2.10']`

## Building Dynamic Configurations

Extract is useful for building configurations from templates where you select specific items based on some criteria:

```yaml
# Build a load balancer config for selected backend pools
- name: Define all backend pools
  ansible.builtin.set_fact:
    backend_pools:
      web:
        servers: ["10.0.1.10:8080", "10.0.1.11:8080"]
        health_check: /health
        algorithm: roundrobin
      api:
        servers: ["10.0.2.10:3000", "10.0.2.11:3000"]
        health_check: /api/status
        algorithm: leastconn
      websocket:
        servers: ["10.0.3.10:8443"]
        health_check: /ws/ping
        algorithm: source

- name: Generate config for active pools
  ansible.builtin.template:
    src: haproxy_backends.j2
    dest: /etc/haproxy/backends.cfg
  vars:
    active_pools: [web, api]
    pool_configs: "{{ active_pools | map('extract', backend_pools) | list }}"
```

## Using extract with Inventory Data

Pull specific facts from hostvars for a subset of hosts:

```yaml
# Extract IP addresses from hostvars for a group of hosts
- name: Get web server IPs
  ansible.builtin.debug:
    msg: >
      Web server IPs:
      {{ groups['webservers']
         | map('extract', hostvars, 'ansible_default_ipv4')
         | map(attribute='address')
         | list }}
```

This extracts the `ansible_default_ipv4` fact from each host in the `webservers` group, then pulls the `address` attribute from each result.

## Generating Template Data

```jinja2
{# templates/upstream.conf.j2 - Generate upstream config for selected backends #}
{% for pool_name in active_pools %}
{% set pool = pool_name | extract(backend_pools) %}
upstream {{ pool_name }}_backend {
    {{ pool.algorithm }};
{% for server in pool.servers %}
    server {{ server }};
{% endfor %}
}
{% endfor %}
```

## Cross-Referencing Data Structures

A powerful pattern is using extract to cross-reference between different data structures:

```yaml
# Cross-reference user roles with permission definitions
- name: Resolve user permissions
  ansible.builtin.debug:
    msg: "{{ user.name }} has permissions: {{ user.roles | map('extract', role_permissions) | flatten | unique | sort }}"
  loop: "{{ users }}"
  loop_control:
    loop_var: user
    label: "{{ user.name }}"
  vars:
    role_permissions:
      admin: [read, write, delete, manage_users]
      editor: [read, write]
      viewer: [read]
      deployer: [read, deploy, rollback]
    users:
      - name: alice
        roles: [admin]
      - name: bob
        roles: [editor, deployer]
      - name: charlie
        roles: [viewer]
```

Output:
```
alice has permissions: ['delete', 'manage_users', 'read', 'write']
bob has permissions: ['deploy', 'read', 'rollback', 'write']
charlie has permissions: ['read']
```

Bob's roles (editor and deployer) are extracted from the role_permissions map, flattened into a single list, and deduplicated.

## Extract with Default Values

When a key might not exist in the source data, combine extract with the default filter:

```yaml
# Safely extract with fallback values
- name: Get configs with defaults
  ansible.builtin.debug:
    msg: "{{ item }}: {{ item | extract(overrides, default='not set') }}"
  loop: [timeout, retries, max_connections, buffer_size]
  vars:
    overrides:
      timeout: 60
      retries: 5
```

Note that the `default` behavior with extract can be tricky. A safer pattern is:

```yaml
# Safer default handling
- name: Safe extraction with defaults
  ansible.builtin.debug:
    msg: "{{ overrides[item] | default(defaults[item]) }}"
  loop: [timeout, retries, max_connections]
  vars:
    defaults:
      timeout: 30
      retries: 3
      max_connections: 100
    overrides:
      timeout: 60
```

## Comparison with Other Approaches

There are several ways to extract values in Ansible. Here is when to use each:

```yaml
# Different ways to get values from data structures

# map(attribute=...) - for lists of dicts, get one attribute
- debug:
    msg: "{{ servers | map(attribute='ip') | list }}"

# map('extract', ...) - for pulling from a lookup structure by keys
- debug:
    msg: "{{ host_names | map('extract', ip_lookup) | list }}"

# Direct access - when you know the exact key
- debug:
    msg: "{{ ip_lookup['web01'] }}"
```

Use `extract` when you have a list of keys and a dictionary to look them up in. Use `map(attribute=...)` when you have a list of dicts and want a specific field from each.

## Summary

The `extract` filter bridges the gap between having a list of keys or indices and getting the corresponding values from a data structure. It shines when combined with `map` for batch lookups, when cross-referencing between data structures, and when building dynamic configurations from subsets of larger datasets. Remember that it works with both dictionaries (by key) and lists (by index), supports nested attribute extraction, and pairs well with other filters like `flatten`, `unique`, and `sort` for post-processing the extracted results.
