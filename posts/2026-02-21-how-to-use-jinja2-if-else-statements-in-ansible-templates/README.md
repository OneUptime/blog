# How to Use Jinja2 if/else Statements in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Conditionals

Description: Learn how to use Jinja2 if, elif, and else statements in Ansible templates to create dynamic configuration files with conditional sections.

---

Real configuration files are not static. Some sections only appear in production. Some features are toggled on or off per environment. SSL blocks exist only when certificates are present. Jinja2's `if`/`elif`/`else` statements let you build templates that adapt their output based on variables, facts, and conditions. This is what makes Ansible templates truly dynamic.

This post covers the full range of Jinja2 conditional syntax in Ansible templates, from simple if blocks to complex multi-condition logic with tests and filters.

## Basic if Statement

The simplest conditional includes a block of text only when a condition is true.

```jinja2
{# templates/app.conf.j2 #}
{# Include debug settings only when debug mode is on #}
[application]
name = {{ app_name }}
port = {{ app_port }}

{% if debug_mode %}
[debug]
verbose_logging = true
sql_echo = true
profiling = true
{% endif %}
```

When `debug_mode` is true (or truthy), the debug section appears. When false, it is omitted entirely. No empty lines, no leftover brackets.

## if/else Statement

When you need one value in one case and a different value otherwise.

```jinja2
{# templates/nginx.conf.j2 #}
{# Listen on different ports based on SSL configuration #}
server {
{% if ssl_enabled %}
    listen 443 ssl;
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
{% else %}
    listen 80;
{% endif %}
    server_name {{ server_name }};
}
```

The playbook provides the variables:

```yaml
# deploy-nginx.yml
# Deploys Nginx config with conditional SSL
- name: Deploy Nginx configuration
  hosts: webservers
  become: true
  vars:
    server_name: app.example.com
    ssl_enabled: true
    ssl_cert_path: /etc/ssl/certs/app.pem
    ssl_key_path: /etc/ssl/private/app.key
  tasks:
    - name: Generate Nginx config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/sites-available/app.conf
        mode: '0644'
```

## if/elif/else Chain

For multiple conditions, use `elif` (else if).

```jinja2
{# templates/logging.conf.j2 #}
{# Set logging configuration based on environment #}
[logging]
{% if environment == 'production' %}
level = WARNING
file = /var/log/{{ app_name }}/app.log
rotate = daily
keep = 30
{% elif environment == 'staging' %}
level = INFO
file = /var/log/{{ app_name }}/app.log
rotate = daily
keep = 7
{% elif environment == 'development' %}
level = DEBUG
file = /var/log/{{ app_name }}/app.log
rotate = never
keep = 1
{% else %}
level = INFO
file = /tmp/{{ app_name }}.log
rotate = never
keep = 1
{% endif %}
```

## Checking if Variables are Defined

Use the `is defined` test to check whether a variable exists before using it.

```jinja2
{# templates/database.conf.j2 #}
{# Include optional configuration only when variables are provided #}
[database]
host = {{ db_host }}
port = {{ db_port | default(5432) }}
name = {{ db_name }}

{% if db_username is defined and db_password is defined %}
username = {{ db_username }}
password = {{ db_password }}
{% endif %}

{% if db_ssl_mode is defined %}
ssl_mode = {{ db_ssl_mode }}
{% if db_ssl_cert is defined %}
ssl_cert = {{ db_ssl_cert }}
ssl_key = {{ db_ssl_key }}
ssl_ca = {{ db_ssl_ca }}
{% endif %}
{% endif %}

{% if db_pool_size is defined %}
pool_size = {{ db_pool_size }}
pool_timeout = {{ db_pool_timeout | default(30) }}
{% endif %}
```

This template adapts based on which variables are provided. A minimal database config only needs `db_host` and `db_name`. SSL and pool settings are included only when their variables exist.

## Boolean and Truthy Checks

In Jinja2, several values are considered falsy: `false`, `0`, `None`, empty string `""`, empty list `[]`, and empty dict `{}`. Everything else is truthy.

```jinja2
{# templates/features.conf.j2 #}
{# Toggle features based on boolean flags #}
[features]
{% if enable_caching %}
caching = on
cache_ttl = {{ cache_ttl | default(3600) }}
cache_backend = {{ cache_backend | default('redis') }}
{% else %}
caching = off
{% endif %}

{% if enable_rate_limiting %}
rate_limiting = on
rate_limit = {{ rate_limit | default('100/minute') }}
{% else %}
rate_limiting = off
{% endif %}

{% if maintenance_mode %}
maintenance = on
maintenance_message = {{ maintenance_message | default('System is under maintenance') }}
{% endif %}
```

## Comparing Values

Jinja2 supports standard comparison operators.

```jinja2
{# templates/worker.conf.j2 #}
{# Adjust worker settings based on available resources #}
[workers]
{% if ansible_processor_vcpus >= 8 %}
count = {{ ansible_processor_vcpus }}
type = prefork
{% elif ansible_processor_vcpus >= 4 %}
count = {{ ansible_processor_vcpus - 1 }}
type = prefork
{% else %}
count = 2
type = threaded
{% endif %}

{% if ansible_memtotal_mb > 4096 %}
max_memory_per_worker = 512M
{% elif ansible_memtotal_mb > 2048 %}
max_memory_per_worker = 256M
{% else %}
max_memory_per_worker = 128M
{% endif %}
```

Available comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`.

## Combining Conditions with and/or/not

Complex conditions use `and`, `or`, and `not`.

```jinja2
{# templates/security.conf.j2 #}
{# Security configuration with complex conditionals #}
[security]
{% if ssl_enabled and environment == 'production' %}
hsts = on
hsts_max_age = 31536000
hsts_include_subdomains = true
{% endif %}

{% if not allow_password_auth or environment == 'production' %}
password_authentication = no
{% else %}
password_authentication = yes
{% endif %}

{% if (enable_2fa and environment == 'production') or force_2fa %}
two_factor_auth = required
{% elif enable_2fa %}
two_factor_auth = optional
{% else %}
two_factor_auth = disabled
{% endif %}
```

## Testing Variable Types

Jinja2 has built-in tests for checking variable types.

```jinja2
{# templates/smart-config.conf.j2 #}
{# Handle variables that might be different types #}
[servers]
{% if backend_servers is string %}
{# Single server as a string #}
server = {{ backend_servers }}
{% elif backend_servers is iterable %}
{# Multiple servers as a list #}
{% for server in backend_servers %}
server_{{ loop.index }} = {{ server }}
{% endfor %}
{% endif %}

[ports]
{% if allowed_ports is number %}
port = {{ allowed_ports }}
{% elif allowed_ports is iterable %}
ports = {{ allowed_ports | join(',') }}
{% endif %}
```

## Inline Conditionals

For simple one-line conditions, use the inline (ternary) form.

```jinja2
{# templates/inline-conditions.conf.j2 #}
{# Inline conditionals for simple value selection #}
[application]
debug = {{ 'true' if debug_mode else 'false' }}
log_level = {{ 'DEBUG' if debug_mode else 'INFO' }}
workers = {{ 1 if environment == 'development' else app_workers | default(4) }}
bind = {{ '127.0.0.1' if environment == 'development' else '0.0.0.0' }}
protocol = {{ 'https' if ssl_enabled else 'http' }}
```

This is cleaner than full if/else blocks for simple value assignment.

## Conditional Blocks in Nginx

Here is a realistic Nginx template with multiple conditional sections.

```jinja2
{# templates/nginx-full.conf.j2 #}
{# Full Nginx server block with conditional features #}
server {
{% if ssl_enabled %}
    listen 443 ssl http2;
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
{% else %}
    listen 80;
{% endif %}
    server_name {{ server_name }};

{% if enable_access_log %}
    access_log /var/log/nginx/{{ server_name }}.access.log;
{% else %}
    access_log off;
{% endif %}
    error_log /var/log/nginx/{{ server_name }}.error.log;

{% if enable_gzip %}
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
{% endif %}

{% if maintenance_mode %}
    location / {
        return 503 "Service temporarily unavailable";
    }
{% else %}
    location / {
        proxy_pass http://{{ upstream_host }}:{{ upstream_port }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

{% if enable_websockets %}
    location /ws {
        proxy_pass http://{{ upstream_host }}:{{ websocket_port | default(upstream_port) }};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
{% endif %}

{% if static_files_path is defined %}
    location /static/ {
        alias {{ static_files_path }}/;
        expires 30d;
    }
{% endif %}
{% endif %}
}

{% if ssl_enabled and ssl_redirect %}
server {
    listen 80;
    server_name {{ server_name }};
    return 301 https://$server_name$request_uri;
}
{% endif %}
```

## Whitespace Control

Jinja2 conditionals can leave unwanted blank lines. Use `-` to strip whitespace.

```jinja2
{# Without whitespace control (leaves blank lines) #}
{% if feature_a %}
feature_a = enabled
{% endif %}
{% if feature_b %}
feature_b = enabled
{% endif %}

{# With whitespace control (no blank lines) #}
{%- if feature_a %}
feature_a = enabled
{%- endif %}
{%- if feature_b %}
feature_b = enabled
{%- endif %}
```

The `-` after `{%` or before `%}` strips whitespace (including newlines) on that side.

## Testing with in Operator

Check if a value exists in a list.

```jinja2
{# templates/module-config.conf.j2 #}
{# Enable modules based on a feature list #}
[modules]
{% if 'caching' in enabled_features %}
cache_module = on
{% endif %}
{% if 'compression' in enabled_features %}
compression_module = on
{% endif %}
{% if 'auth' in enabled_features %}
auth_module = on
auth_backend = {{ auth_backend | default('ldap') }}
{% endif %}
```

```yaml
vars:
  enabled_features:
    - caching
    - auth
    - monitoring
```

## Summary

Jinja2 conditionals in Ansible templates let you build configuration files that adapt to any environment, host, or feature set. Use `{% if %}` for optional sections, `{% if %}{% else %}` for two-way choices, and `{% if %}{% elif %}{% else %}` for multi-way decisions. Test variables with `is defined` before using them, combine conditions with `and`/`or`/`not`, and use inline conditionals for simple value assignment. Apply whitespace control with `-` to keep your rendered output clean. The goal is to have one template that works across all your environments by toggling sections based on variables.
