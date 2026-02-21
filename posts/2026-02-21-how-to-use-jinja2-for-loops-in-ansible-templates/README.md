# How to Use Jinja2 for Loops in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Loops

Description: Learn how to use Jinja2 for loops in Ansible templates to generate repetitive configuration sections from lists and dictionaries dynamically.

---

Configuration files are full of repeated patterns. An Nginx upstream block lists multiple backend servers. A `/etc/hosts` file has one line per host. A systemd service file may need multiple `Environment=` directives. Writing these out manually in a template defeats the purpose of automation. Jinja2 `for` loops inside Ansible templates let you generate these repetitive sections from data, keeping your templates compact and your configurations data-driven.

This post covers Jinja2 for loop syntax, iterating over lists and dictionaries, loop variables, nested loops, and practical examples for common configuration files.

## Basic for Loop

The basic syntax iterates over a list and renders content for each item.

```jinja2
{# templates/hosts.j2 #}
{# Generate /etc/hosts entries from a list of servers #}
127.0.0.1   localhost
::1         localhost

{% for server in servers %}
{{ server.ip }}   {{ server.hostname }} {{ server.hostname }}.{{ domain }}
{% endfor %}
```

The playbook provides the data:

```yaml
# deploy-hosts.yml
# Generates /etc/hosts from server list
- name: Deploy hosts file
  hosts: all
  become: true
  vars:
    domain: example.internal
    servers:
      - { hostname: "web-01", ip: "10.0.1.10" }
      - { hostname: "web-02", ip: "10.0.1.11" }
      - { hostname: "db-01", ip: "10.0.2.10" }
      - { hostname: "cache-01", ip: "10.0.3.10" }
  tasks:
    - name: Generate hosts file
      ansible.builtin.template:
        src: hosts.j2
        dest: /etc/hosts
        mode: '0644'
```

Rendered output:

```
127.0.0.1   localhost
::1         localhost

10.0.1.10   web-01 web-01.example.internal
10.0.1.11   web-02 web-02.example.internal
10.0.2.10   db-01 db-01.example.internal
10.0.3.10   cache-01 cache-01.example.internal
```

## Loop Variables

Jinja2 provides several built-in variables inside `for` loops.

```jinja2
{# templates/loop-vars.conf.j2 #}
{# Demonstrates all available loop variables #}
{% for item in items %}
# Item {{ loop.index }} of {{ loop.length }}
# Index (0-based): {{ loop.index0 }}
# Reverse index: {{ loop.revindex }}
# First item: {{ loop.first }}
# Last item: {{ loop.last }}
value_{{ loop.index }} = {{ item }}
{% endfor %}
```

| Variable | Description |
|----------|-------------|
| `loop.index` | Current iteration (1-based) |
| `loop.index0` | Current iteration (0-based) |
| `loop.revindex` | Iterations remaining (1-based) |
| `loop.revindex0` | Iterations remaining (0-based) |
| `loop.first` | True if first iteration |
| `loop.last` | True if last iteration |
| `loop.length` | Total number of items |
| `loop.cycle()` | Cycle through a list of values |

## Comma-Separated Lists

A common need is generating comma-separated values without a trailing comma.

```jinja2
{# templates/allowed-ips.conf.j2 #}
{# Generate comma-separated list without trailing comma #}
allowed_ips = {% for ip in allowed_ips %}{{ ip }}{{ ', ' if not loop.last else '' }}{% endfor %}
```

With `allowed_ips: ['10.0.1.10', '10.0.1.11', '10.0.2.10']`, this renders:

```
allowed_ips = 10.0.1.10, 10.0.1.11, 10.0.2.10
```

An alternative using the `join` filter:

```jinja2
allowed_ips = {{ allowed_ips | join(', ') }}
```

The `join` filter is simpler for this case, but the loop approach gives you more control over formatting.

## Iterating Over Dictionaries

Use `.items()` to iterate over dictionary key-value pairs.

```jinja2
{# templates/environment.j2 #}
{# Generate environment variable exports from a dictionary #}
{% for key, value in env_vars.items() %}
export {{ key }}="{{ value }}"
{% endfor %}
```

```yaml
vars:
  env_vars:
    DATABASE_URL: "postgresql://db.internal:5432/myapp"
    REDIS_URL: "redis://cache.internal:6379"
    SECRET_KEY: "{{ vault_secret_key }}"
    LOG_LEVEL: "info"
```

Rendered:

```
export DATABASE_URL="postgresql://db.internal:5432/myapp"
export REDIS_URL="redis://cache.internal:6379"
export SECRET_KEY="actual-secret-value"
export LOG_LEVEL="info"
```

## Nginx Upstream Configuration

A practical example: generating an Nginx upstream block.

```jinja2
{# templates/upstream.conf.j2 #}
{# Generate Nginx upstream block from a list of backend servers #}
upstream {{ upstream_name }} {
{% if upstream_method is defined %}
    {{ upstream_method }};
{% endif %}
{% for server in upstream_servers %}
    server {{ server.host }}:{{ server.port }}{{ ' weight=' + server.weight | string if server.weight is defined else '' }}{{ ' backup' if server.backup | default(false) else '' }};
{% endfor %}
}
```

```yaml
vars:
  upstream_name: backend
  upstream_method: least_conn
  upstream_servers:
    - { host: "10.0.1.10", port: 8080, weight: 3 }
    - { host: "10.0.1.11", port: 8080, weight: 2 }
    - { host: "10.0.1.12", port: 8080, backup: true }
```

## Conditional Content Inside Loops

Combine `for` with `if` to filter items during iteration.

```jinja2
{# templates/firewall.rules.j2 #}
{# Generate firewall rules, separating TCP and UDP #}
# TCP Rules
{% for rule in firewall_rules if rule.protocol == 'tcp' %}
-A INPUT -p tcp --dport {{ rule.port }} -j ACCEPT  # {{ rule.comment }}
{% endfor %}

# UDP Rules
{% for rule in firewall_rules if rule.protocol == 'udp' %}
-A INPUT -p udp --dport {{ rule.port }} -j ACCEPT  # {{ rule.comment }}
{% endfor %}
```

The `if` clause after `for` filters items before iteration, so the loop body only executes for matching items.

## Nested Loops

For hierarchical data, nest `for` loops.

```jinja2
{# templates/haproxy.cfg.j2 #}
{# Generate HAProxy configuration with multiple backends #}
global
    daemon
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http_front
    bind *:80
{% for backend in backends %}
    acl is_{{ backend.name }} hdr(host) -i {{ backend.domain }}
    use_backend {{ backend.name }}_back if is_{{ backend.name }}
{% endfor %}

{% for backend in backends %}
backend {{ backend.name }}_back
    balance {{ backend.balance | default('roundrobin') }}
{% for server in backend.servers %}
    server {{ server.name }} {{ server.host }}:{{ server.port }} check
{% endfor %}

{% endfor %}
```

```yaml
vars:
  backends:
    - name: api
      domain: api.example.com
      balance: leastconn
      servers:
        - { name: "api-1", host: "10.0.1.10", port: 8080 }
        - { name: "api-2", host: "10.0.1.11", port: 8080 }
    - name: web
      domain: www.example.com
      servers:
        - { name: "web-1", host: "10.0.2.10", port: 3000 }
        - { name: "web-2", host: "10.0.2.11", port: 3000 }
        - { name: "web-3", host: "10.0.2.12", port: 3000 }
```

## Loop with else

The `else` block executes when the loop has zero iterations (empty list).

```jinja2
{# templates/upstream-safe.conf.j2 #}
{# Handles the case where no servers are defined #}
upstream {{ upstream_name }} {
{% for server in upstream_servers %}
    server {{ server.host }}:{{ server.port }};
{% else %}
    # No servers defined - using fallback
    server 127.0.0.1:8080;
{% endfor %}
}
```

If `upstream_servers` is empty, the fallback server is included instead.

## Whitespace Control in Loops

Loops can produce unwanted blank lines. Use `-` to strip whitespace.

```jinja2
{# Without whitespace control #}
{% for item in items %}
{{ item }}
{% endfor %}
{# Produces a blank line at the end #}

{# With whitespace control #}
{% for item in items -%}
{{ item }}
{% endfor -%}
{# Clean output, no extra blank lines #}
```

More precise control:

```jinja2
{# Strip leading whitespace before the tag #}
{%- for item in items %}
{{ item }}
{%- endfor %}
```

## The cycle Helper

Use `loop.cycle()` to alternate between values.

```jinja2
{# templates/table.html.j2 #}
{# Alternate row colors in an HTML table #}
<table>
{% for server in servers %}
  <tr class="{{ loop.cycle('odd', 'even') }}">
    <td>{{ server.name }}</td>
    <td>{{ server.ip }}</td>
  </tr>
{% endfor %}
</table>
```

## Systemd Environment Variables

A practical example showing how loops generate multiple directive lines.

```jinja2
{# templates/myapp.service.j2 #}
{# Systemd service with environment variables from a dictionary #}
[Unit]
Description={{ service_description }}
After=network.target

[Service]
Type=simple
User={{ service_user }}
WorkingDirectory={{ service_working_dir }}
ExecStart={{ service_exec_start }}
Restart=always
RestartSec=5
{% for key, value in service_env.items() | sort %}
Environment="{{ key }}={{ value }}"
{% endfor %}

[Install]
WantedBy=multi-user.target
```

The `| sort` ensures environment variables appear in alphabetical order for consistency.

## Generating JSON or YAML Inside Templates

You can generate structured data inside templates using loops.

```jinja2
{# templates/config.json.j2 #}
{# Generate a JSON configuration file #}
{
  "servers": [
{% for server in servers %}
    {
      "name": "{{ server.name }}",
      "host": "{{ server.host }}",
      "port": {{ server.port }}
    }{{ ',' if not loop.last else '' }}
{% endfor %}
  ]
}
```

For JSON output, using the `to_json` or `to_nice_json` filter in the playbook is often simpler than manually formatting JSON in a template. But when you need specific formatting or comments, the loop approach gives you full control.

## Summary

Jinja2 for loops in Ansible templates turn data into configuration. Iterate over lists with `{% for item in list %}`, over dictionaries with `{% for key, value in dict.items() %}`, and use loop variables like `loop.first`, `loop.last`, and `loop.index` for position-aware formatting. Filter items inline with `{% for item in list if condition %}`, handle empty lists with the `else` block, and use whitespace control (`-`) to prevent blank lines. Nest loops for hierarchical data structures, and use `loop.cycle()` for alternating patterns. The key principle is to keep your data in Ansible variables and let the template loop generate the repetitive sections.
