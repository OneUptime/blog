# How to Use the selectattr and rejectattr Filters in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Data Processing, Templates

Description: Learn how to use the selectattr and rejectattr filters in Ansible to filter lists of objects based on attribute values.

---

When you have a list of dictionaries (which is extremely common in Ansible for representing servers, users, packages, services, etc.), you often need to filter that list based on the value of a specific attribute. The `selectattr` filter keeps items where an attribute passes a test, and `rejectattr` removes items where an attribute passes a test. They are the dictionary-aware counterparts of `select` and `reject`.

## Basic Syntax

```jinja2
{# selectattr keeps items where the attribute test is true #}
{{ list_of_dicts | selectattr('attribute_name', 'test', value) | list }}

{# rejectattr removes items where the attribute test is true #}
{{ list_of_dicts | rejectattr('attribute_name', 'test', value) | list }}
```

## Simple Boolean Filtering

The simplest form checks if an attribute is truthy:

```yaml
# Example data
servers:
  - name: web-01
    ip: "10.0.1.10"
    enabled: true
  - name: web-02
    ip: "10.0.1.11"
    enabled: false
  - name: api-01
    ip: "10.0.2.10"
    enabled: true
  - name: db-01
    ip: "10.0.3.10"
    enabled: true
```

```jinja2
{# Get enabled servers #}
{{ servers | selectattr('enabled') | list }}
{# Returns: web-01, api-01, db-01 server dicts #}

{# Get disabled servers #}
{{ servers | rejectattr('enabled') | list }}
{# Returns: web-02 server dict #}
```

## Using Comparison Tests

Add a test name and comparison value for more precise filtering:

```jinja2
{# Select servers with a specific role #}
{{ servers | selectattr('role', 'eq', 'web') | list }}

{# Reject servers from a specific environment #}
{{ servers | rejectattr('env', 'eq', 'development') | list }}

{# Select servers with more than 8GB of RAM #}
{{ servers | selectattr('memory_gb', 'gt', 8) | list }}

{# Select servers with port 8080 or above #}
{{ servers | selectattr('port', 'ge', 8080) | list }}
```

## Practical Example: HAProxy Backend Configuration

Here is a real-world scenario where you filter servers by role and status to generate HAProxy configuration:

```yaml
# haproxy_config.yml - Generate HAProxy config with filtered backends
- name: Configure HAProxy
  hosts: load_balancers
  vars:
    all_backends:
      - name: web-01
        address: "10.0.1.10"
        port: 8080
        role: web
        status: active
        weight: 5
      - name: web-02
        address: "10.0.1.11"
        port: 8080
        role: web
        status: maintenance
        weight: 5
      - name: web-03
        address: "10.0.1.12"
        port: 8080
        role: web
        status: active
        weight: 3
      - name: api-01
        address: "10.0.2.10"
        port: 9090
        role: api
        status: active
        weight: 5
      - name: api-02
        address: "10.0.2.11"
        port: 9090
        role: api
        status: active
        weight: 5
      - name: static-01
        address: "10.0.3.10"
        port: 80
        role: static
        status: active
        weight: 1
  tasks:
    - name: Generate HAProxy config
      ansible.builtin.template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
      notify: Reload HAProxy
```

```jinja2
{# haproxy.cfg.j2 - HAProxy config using selectattr for filtering #}
global
    maxconn 4096
    log /dev/log local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog

# Web backend - only active web servers
{% set active_web = all_backends | selectattr('role', 'eq', 'web') | selectattr('status', 'eq', 'active') | list %}
{% if active_web %}
backend web_backend
    balance roundrobin
    option httpchk GET /health
{% for server in active_web %}
    server {{ server.name }} {{ server.address }}:{{ server.port }} check weight {{ server.weight }}
{% endfor %}
{% endif %}

# API backend - only active API servers
{% set active_api = all_backends | selectattr('role', 'eq', 'api') | selectattr('status', 'eq', 'active') | list %}
{% if active_api %}
backend api_backend
    balance leastconn
    option httpchk GET /health
{% for server in active_api %}
    server {{ server.name }} {{ server.address }}:{{ server.port }} check weight {{ server.weight }}
{% endfor %}
{% endif %}

# Servers in maintenance (commented out for reference)
{% set maintenance = all_backends | selectattr('status', 'eq', 'maintenance') | list %}
{% for server in maintenance %}
# MAINTENANCE: {{ server.name }} ({{ server.role }}) - {{ server.address }}:{{ server.port }}
{% endfor %}
```

## Chaining selectattr with map

A common pattern is filtering with `selectattr` and then extracting a field with `map`:

```jinja2
{# Get IP addresses of all active web servers #}
{{ all_backends
   | selectattr('role', 'eq', 'web')
   | selectattr('status', 'eq', 'active')
   | map(attribute='address')
   | list
}}
{# Output: ['10.0.1.10', '10.0.1.12'] #}

{# Get names of servers in maintenance #}
{{ all_backends
   | selectattr('status', 'eq', 'maintenance')
   | map(attribute='name')
   | join(', ')
}}
{# Output: web-02 #}
```

## Pattern Matching with selectattr

Use the `match` or `search` tests for pattern-based filtering:

```jinja2
{# Select servers whose name starts with "web" #}
{{ servers | selectattr('name', 'match', '^web-') | list }}

{# Select servers in the .internal domain #}
{{ servers | selectattr('fqdn', 'search', '\\.internal$') | list }}

{# Reject servers whose name contains "test" #}
{{ servers | rejectattr('name', 'search', 'test') | list }}
```

## Practical Example: User Management

Filter users by role and status for generating access control configurations:

```yaml
# user_access.yml - Generate access control from user data
- name: Configure user access
  hosts: all
  vars:
    all_users:
      - username: alice
        role: admin
        ssh_key: "ssh-rsa AAAA... alice@company"
        active: true
        teams: ["platform", "security"]
      - username: bob
        role: developer
        ssh_key: "ssh-rsa AAAA... bob@company"
        active: true
        teams: ["backend"]
      - username: charlie
        role: developer
        ssh_key: "ssh-rsa AAAA... charlie@company"
        active: false
        teams: ["frontend"]
      - username: diana
        role: ops
        ssh_key: "ssh-rsa AAAA... diana@company"
        active: true
        teams: ["platform"]
  tasks:
    - name: Add SSH keys for active users
      ansible.posix.authorized_key:
        user: "{{ item.username }}"
        key: "{{ item.ssh_key }}"
      loop: "{{ all_users | selectattr('active') | list }}"

    - name: Generate sudoers file
      ansible.builtin.template:
        src: sudoers.j2
        dest: /etc/sudoers.d/managed-users
        validate: "visudo -cf %s"
```

```jinja2
{# sudoers.j2 - Sudoers file using selectattr to filter by role #}
# Managed by Ansible - do not edit manually

# Admins get full sudo
{% for user in all_users | selectattr('active') | selectattr('role', 'eq', 'admin') %}
{{ user.username }} ALL=(ALL:ALL) ALL
{% endfor %}

# Ops get service management sudo
{% for user in all_users | selectattr('active') | selectattr('role', 'eq', 'ops') %}
{{ user.username }} ALL=(ALL) /usr/bin/systemctl, /usr/bin/journalctl
{% endfor %}

# Developers get limited access
{% for user in all_users | selectattr('active') | selectattr('role', 'eq', 'developer') %}
{{ user.username }} ALL=(ALL) /usr/bin/docker, /usr/local/bin/kubectl
{% endfor %}

# Inactive users (for reference)
# {{ all_users | rejectattr('active') | map(attribute='username') | join(', ') }}
```

## Filtering with the in Test

Check if an attribute value is in a list:

```jinja2
{# Select servers in specific environments #}
{% set production_envs = ['production', 'staging'] %}
{% set prod_servers = servers | selectattr('environment', 'in', production_envs) | list %}
```

Note: The `in` test is available in Ansible 2.10+. For older versions, you may need a workaround.

## Counting Filtered Items

```jinja2
{# Count servers by status #}
Active: {{ all_servers | selectattr('status', 'eq', 'active') | list | length }}
Maintenance: {{ all_servers | selectattr('status', 'eq', 'maintenance') | list | length }}
Disabled: {{ all_servers | selectattr('status', 'eq', 'disabled') | list | length }}
Total: {{ all_servers | list | length }}
```

## Practical Example: Kubernetes Service Discovery

Generate service mesh configuration based on service attributes:

```yaml
# service_mesh.yml - Generate service mesh config from service registry
- name: Configure service mesh
  hosts: localhost
  vars:
    service_registry:
      - name: user-service
        namespace: production
        port: 8080
        protocol: grpc
        health_check: "/grpc.health.v1.Health/Check"
        circuit_breaker: true
        retry_policy: true
      - name: order-service
        namespace: production
        port: 8080
        protocol: http
        health_check: "/health"
        circuit_breaker: true
        retry_policy: true
      - name: payment-service
        namespace: production
        port: 8443
        protocol: https
        health_check: "/health"
        circuit_breaker: true
        retry_policy: false
      - name: analytics-service
        namespace: production
        port: 8080
        protocol: http
        health_check: "/health"
        circuit_breaker: false
        retry_policy: false
  tasks:
    - name: Generate Envoy sidecar config
      ansible.builtin.template:
        src: envoy.yaml.j2
        dest: /etc/envoy/envoy.yaml
```

```jinja2
{# envoy.yaml.j2 - Service mesh config using selectattr #}
static_resources:
  clusters:
{% for svc in service_registry %}
    - name: {{ svc.name }}
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
{% if svc.protocol == 'grpc' %}
      http2_protocol_options: {}
{% endif %}
      load_assignment:
        cluster_name: {{ svc.name }}
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: {{ svc.name }}.{{ svc.namespace }}.svc.cluster.local
                      port_value: {{ svc.port }}
{% if svc.circuit_breaker %}
      circuit_breakers:
        thresholds:
          - max_connections: 1024
            max_pending_requests: 1024
            max_requests: 1024
{% endif %}
{% endfor %}

# Services with retry policy: {{ service_registry | selectattr('retry_policy') | map(attribute='name') | join(', ') }}
# Services without circuit breaker: {{ service_registry | rejectattr('circuit_breaker') | map(attribute='name') | join(', ') }}
# gRPC services: {{ service_registry | selectattr('protocol', 'eq', 'grpc') | map(attribute='name') | join(', ') }}
```

## Nested Attribute Filtering

You can filter on nested attributes using dot notation:

```yaml
# nested data
services:
  - name: web
    config:
      ssl: true
      port: 443
  - name: api
    config:
      ssl: false
      port: 8080
```

```jinja2
{# Filter by nested attribute #}
SSL services: {{ services | selectattr('config.ssl') | map(attribute='name') | join(', ') }}
{# Output: web #}
```

## Using selectattr in Playbook Conditionals

```yaml
# conditional_deploy.yml - Conditional deployment based on filtered data
- name: Deploy only if there are active servers
  ansible.builtin.template:
    src: config.j2
    dest: /etc/myapp/config.yml
  when: (servers | selectattr('enabled') | list | length) > 0

- name: Send alert if too many servers in maintenance
  ansible.builtin.uri:
    url: "https://alerts.example.com/webhook"
    method: POST
    body:
      text: "{{ servers | selectattr('status', 'eq', 'maintenance') | list | length }} servers in maintenance"
    body_format: json
  when: (servers | selectattr('status', 'eq', 'maintenance') | list | length) > 2
```

## Wrapping Up

The `selectattr` and `rejectattr` filters are indispensable for working with lists of dictionaries in Ansible. They let you filter objects based on attribute values using the same test functions available for `select` and `reject` (equality, comparison, pattern matching, truthiness). Combined with `map` for attribute extraction and `join` for string formatting, they provide a complete pipeline for querying and transforming structured data in your playbooks and templates. Use `selectattr` to keep what you want and `rejectattr` to discard what you do not.
