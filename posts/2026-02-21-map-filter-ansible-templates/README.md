# How to Use the map Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Templates, Data Processing

Description: Learn how to use the Jinja2 map filter in Ansible to transform list elements by applying filters or extracting attributes.

---

The `map` filter is one of the most versatile tools for working with lists in Ansible. It applies a transformation to every element in a list and returns a new list with the results. If you have ever found yourself writing a `{% for %}` loop just to transform each item and build a new list, `map` can likely replace that loop with a single expression.

## Basic Syntax

The `map` filter has two main modes:

1. **Apply a filter** to each element: `list | map('filter_name')`
2. **Extract an attribute** from each element: `list | map(attribute='field_name')`

## Extracting Attributes

The most common use of `map` is pulling a specific field from a list of dictionaries:

```yaml
# Example variables
users:
  - name: alice
    email: alice@example.com
    role: admin
  - name: bob
    email: bob@example.com
    role: developer
  - name: charlie
    email: charlie@example.com
    role: developer
```

```jinja2
{# Extract just the names from the list of user dictionaries #}
{{ users | map(attribute='name') | list }}
{# Output: ['alice', 'bob', 'charlie'] #}

{# Extract emails #}
{{ users | map(attribute='email') | list }}
{# Output: ['alice@example.com', 'bob@example.com', 'charlie@example.com'] #}
```

Note: You need `| list` at the end because `map` returns a generator in Jinja2, not a list. Without `| list`, you cannot iterate over it more than once or serialize it.

## Applying Filters to Each Element

You can apply any Jinja2 filter to each element:

```jinja2
{# Convert all strings to uppercase #}
{{ ["hello", "world", "ansible"] | map('upper') | list }}
{# Output: ['HELLO', 'WORLD', 'ANSIBLE'] #}

{# Convert all elements to integers #}
{{ ["1", "2", "3", "4"] | map('int') | list }}
{# Output: [1, 2, 3, 4] #}

{# Trim whitespace from all strings #}
{{ ["  hello ", " world  ", "ansible  "] | map('trim') | list }}
{# Output: ['hello', 'world', 'ansible'] #}
```

## Practical Example: Generating Host Entries

Given a list of server dictionaries, generate `/etc/hosts` entries:

```yaml
# hosts_file.yml - Generate hosts file from inventory data
- name: Generate hosts file
  hosts: localhost
  vars:
    servers:
      - name: web-01
        ip: "10.0.1.10"
      - name: web-02
        ip: "10.0.1.11"
      - name: db-01
        ip: "10.0.2.10"
      - name: cache-01
        ip: "10.0.3.10"
  tasks:
    - name: Render hosts file
      ansible.builtin.template:
        src: hosts.j2
        dest: /tmp/hosts
```

```jinja2
{# hosts.j2 - Using map to extract data for the hosts file #}
# Managed by Ansible
127.0.0.1 localhost

# Application servers
{% for server in servers %}
{{ server.ip }} {{ server.name }}
{% endfor %}

# All server IPs (for reference)
# {{ servers | map(attribute='ip') | join(', ') }}

# All server names
# {{ servers | map(attribute='name') | join(', ') }}
```

## Using map with Filters That Take Arguments

When you apply a filter that takes arguments, pass them after the filter name:

```jinja2
{# Apply regex_replace to each element #}
{{ hostnames | map('regex_replace', '\\.example\\.com$', '') | list }}
{# Input: ['web.example.com', 'db.example.com'] #}
{# Output: ['web', 'db'] #}

{# Apply default to each element #}
{{ items | map('default', 'N/A') | list }}

{# Truncate each string to 10 characters #}
{{ descriptions | map('truncate', 10) | list }}
```

## Real-World Example: Nginx Upstream Configuration

```yaml
# nginx_upstream.yml - Generate Nginx upstream from inventory
- name: Generate Nginx upstream config
  hosts: load_balancers
  vars:
    backend_servers:
      - host: "10.0.1.10"
        port: 8080
        weight: 5
        state: "active"
      - host: "10.0.1.11"
        port: 8080
        weight: 3
        state: "active"
      - host: "10.0.1.12"
        port: 8080
        weight: 1
        state: "backup"
  tasks:
    - name: Write upstream config
      ansible.builtin.template:
        src: upstream.conf.j2
        dest: /etc/nginx/conf.d/upstream.conf
```

```jinja2
{# upstream.conf.j2 - Using map for data extraction #}
# Active servers: {{ backend_servers | selectattr('state', 'eq', 'active') | map(attribute='host') | join(', ') }}
# Backup servers: {{ backend_servers | selectattr('state', 'eq', 'backup') | map(attribute='host') | join(', ') }}

upstream backend_pool {
{% for server in backend_servers %}
    server {{ server.host }}:{{ server.port }} weight={{ server.weight }}{% if server.state == 'backup' %} backup{% endif %};
{% endfor %}
}
```

## Chaining map with Other List Filters

The real power of `map` comes from chaining it with other filters:

### map + select

```jinja2
{# Get names of admin users only #}
{{ users | selectattr('role', 'eq', 'admin') | map(attribute='name') | list }}
```

### map + sort

```jinja2
{# Get sorted list of hostnames #}
{{ servers | map(attribute='hostname') | sort | list }}
```

### map + unique

```jinja2
{# Get unique roles from user list #}
{{ users | map(attribute='role') | unique | list }}
```

### map + join

```jinja2
{# Build comma-separated list of IPs #}
{{ servers | map(attribute='ip') | join(', ') }}
```

### map + reject

```jinja2
{# Get all non-empty tags #}
{{ items | map(attribute='tag') | reject('eq', '') | list }}
```

## Generating Prometheus Targets

```yaml
# prometheus.yml - Build scrape targets using map
- name: Generate Prometheus config
  hosts: monitoring
  vars:
    app_servers:
      - hostname: "web-01"
        ip: "10.0.1.10"
        metrics_port: 9100
      - hostname: "web-02"
        ip: "10.0.1.11"
        metrics_port: 9100
      - hostname: "api-01"
        ip: "10.0.2.10"
        metrics_port: 9090
  tasks:
    - name: Build scrape target list
      ansible.builtin.set_fact:
        # Build "ip:port" strings for each server
        scrape_targets: "{{ app_servers | map(attribute='ip') | list }}"
        # We need more complex transformation for ip:port pairs
```

For cases where you need to build derived values (like `ip:port`), `map` alone is not enough since it cannot combine multiple attributes. Use a loop or list comprehension instead:

```jinja2
{# Build ip:port strings using a loop #}
{% set targets = [] %}
{% for server in app_servers %}
{%   set _ = targets.append(server.ip ~ ':' ~ server.metrics_port) %}
{% endfor %}
targets: {{ targets | to_json }}
```

## Using map in Playbook Tasks

```yaml
# task_examples.yml - Using map in task parameters
- name: Install packages from list of dictionaries
  ansible.builtin.apt:
    name: "{{ packages | map(attribute='name') | list }}"
    state: present
  vars:
    packages:
      - name: nginx
        version: "1.24"
      - name: python3
        version: "3.11"
      - name: postgresql-client
        version: "16"

- name: Add SSH keys for all users
  ansible.posix.authorized_key:
    user: "{{ item }}"
    key: "{{ lookup('file', 'ssh_keys/' ~ item ~ '.pub') }}"
  loop: "{{ team_members | map(attribute='username') | list }}"

- name: Stop all services
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: stopped
  loop: "{{ services | map(attribute='unit_name') | list }}"
```

## Nested Attribute Access

You can access nested attributes using dot notation:

```yaml
# Nested data structure
services:
  - name: web
    config:
      port: 8080
      host: "0.0.0.0"
  - name: api
    config:
      port: 9090
      host: "0.0.0.0"
```

```jinja2
{# Access nested attributes #}
Ports: {{ services | map(attribute='config.port') | list }}
{# Output: [8080, 9090] #}
```

## Template Example: Generating Monitoring Alerts

```jinja2
{# alerts.yml.j2 - Monitoring alert rules using map for data extraction #}
groups:
  - name: service_alerts
    rules:
{% for service in monitored_services %}
      - alert: {{ service.name }}_down
        expr: up{job="{{ service.name }}"} == 0
        for: 5m
        labels:
          severity: {{ service.severity | default('warning') }}
          team: {{ service.team }}
        annotations:
          summary: "{{ service.name }} is down"
          dashboard: "https://grafana.internal/d/{{ service.name }}"
{% endfor %}

  # Summary of monitored services (generated with map)
  # Services: {{ monitored_services | map(attribute='name') | join(', ') }}
  # Teams: {{ monitored_services | map(attribute='team') | unique | join(', ') }}
  # Critical services: {{ monitored_services | selectattr('severity', 'eq', 'critical') | map(attribute='name') | join(', ') }}
```

## Performance Considerations

For large lists, `map` is more efficient than a Jinja2 `{% for %}` loop because it operates at the Python level. However, each `map` call creates a generator, and chaining many `map` calls is still very fast because generators are lazy (they process one element at a time).

```jinja2
{# Efficient chained operations #}
{{ large_list
   | map(attribute='name')
   | map('lower')
   | map('regex_replace', '[^a-z0-9]', '-')
   | unique
   | sort
   | list
}}
```

## Wrapping Up

The `map` filter is essential for data transformation in Ansible. Use `map(attribute='field')` to extract a single field from a list of dictionaries, and `map('filter_name')` to apply a transformation to every element. Chain it with `select`, `reject`, `sort`, `unique`, `join`, and `list` to build complex data processing pipelines in a single expression. It replaces many common `{% for %}` loop patterns and makes your templates more declarative and readable.
