# How to Use the ternary Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Templates

Description: Learn how to use the ternary filter in Ansible templates for inline conditional expressions that simplify your configuration logic.

---

The `ternary` filter provides inline conditional logic in Ansible, similar to the ternary operator (`condition ? true_value : false_value`) found in many programming languages. Instead of writing multi-line `{% if %}...{% else %}...{% endif %}` blocks for simple conditional assignments, you can express the logic in a single expression. This makes templates cleaner and more readable when the condition is straightforward.

## Basic Syntax

The `ternary` filter takes two arguments: the value to return when the expression is truthy, and the value to return when it is falsy.

```jinja2
{# Basic ternary: true_value if condition, else false_value #}
{{ (condition) | ternary("yes", "no") }}
```

For example:

```jinja2
{{ (enable_ssl) | ternary("https", "http") }}
{# If enable_ssl is true: https #}
{# If enable_ssl is false: http #}
```

## Using ternary in Templates

Here is a practical example generating an Nginx configuration:

```jinja2
{# nginx.conf.j2 - Nginx config with ternary conditionals #}
server {
    listen {{ (enable_ssl | default(false)) | ternary('443 ssl', '80') }};
    server_name {{ server_name }};

    {{ (enable_ssl | default(false)) | ternary('ssl_certificate /etc/ssl/certs/' ~ ssl_cert_name ~ '.crt;', '') }}
    {{ (enable_ssl | default(false)) | ternary('ssl_certificate_key /etc/ssl/private/' ~ ssl_cert_name ~ '.key;', '') }}

    access_log /var/log/nginx/{{ server_name }}_access.log {{ (detailed_logging | default(false)) | ternary('combined', 'main') }};

    location / {
        proxy_pass {{ (enable_ssl | default(false)) | ternary('https', 'http') }}://{{ upstream_host }}:{{ upstream_port }};
        proxy_set_header X-Forwarded-Proto {{ (enable_ssl | default(false)) | ternary('https', 'http') }};
    }
}
```

## ternary vs {% if %} Blocks

Both achieve the same result, but `ternary` is more concise for simple cases:

```jinja2
{# Using if/else block - verbose but clear for complex logic #}
{% if enable_debug %}
log_level = debug
{% else %}
log_level = info
{% endif %}

{# Using ternary - concise for simple conditions #}
log_level = {{ (enable_debug | default(false)) | ternary('debug', 'info') }}
```

Use `ternary` for simple one-line conditionals. Use `{% if %}` blocks when the conditional logic is complex or when the true/false branches span multiple lines.

## Practical Example: Application Configuration

Here is a complete example generating an application configuration file:

```yaml
# deploy_app.yml - Deploy application with conditional config
- name: Deploy application configuration
  hosts: app_servers
  vars:
    app_name: "web-api"
    app_port: 8080
    app_env: "production"
    enable_cors: true
    enable_rate_limiting: true
    enable_debug: false
    enable_compression: true
    max_workers: 8
  tasks:
    - name: Generate application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
```

```jinja2
{# app.conf.j2 - Application configuration using ternary filter #}
[server]
name = {{ app_name }}
port = {{ app_port }}
environment = {{ app_env }}
workers = {{ (app_env == 'production') | ternary(max_workers, 2) }}
debug = {{ (enable_debug | default(false)) | ternary('true', 'false') }}

[logging]
level = {{ (app_env == 'production') | ternary('warn', 'debug') }}
format = {{ (app_env == 'production') | ternary('json', 'text') }}
output = {{ (app_env == 'production') | ternary('/var/log/myapp/app.log', 'stdout') }}

[features]
cors = {{ (enable_cors | default(false)) | ternary('enabled', 'disabled') }}
rate_limiting = {{ (enable_rate_limiting | default(false)) | ternary('enabled', 'disabled') }}
compression = {{ (enable_compression | default(true)) | ternary('enabled', 'disabled') }}

[performance]
connection_pool = {{ (app_env == 'production') | ternary(50, 5) }}
cache_ttl = {{ (app_env == 'production') | ternary(3600, 0) }}
timeout = {{ (app_env == 'production') | ternary(30, 120) }}
```

## Using ternary with Comparisons

You can use any comparison expression before `ternary`:

```jinja2
{# Numeric comparisons #}
{{ (ansible_memtotal_mb > 4096) | ternary('4g', '1g') }}

{# String comparisons #}
{{ (ansible_distribution == 'Ubuntu') | ternary('apt', 'yum') }}

{# In checks #}
{{ (app_env in ['staging', 'production']) | ternary('external_db', 'sqlite') }}

{# Combined conditions #}
{{ (enable_ssl and app_env == 'production') | ternary(443, 80) }}
```

## Generating Systemd Unit Files

```jinja2
{# myapp.service.j2 - Systemd unit with conditional settings #}
[Unit]
Description={{ app_name }} Application Service
After=network.target
{{ (requires_database | default(false)) | ternary('After=postgresql.service', '') }}
{{ (requires_database | default(false)) | ternary('Requires=postgresql.service', '') }}

[Service]
Type={{ (app_type == 'daemon') | ternary('forking', 'simple') }}
User={{ app_user }}
Group={{ app_group }}
WorkingDirectory={{ app_dir }}
ExecStart={{ app_dir }}/bin/{{ app_name }} {{ (enable_debug | default(false)) | ternary('--debug', '') }}
Restart={{ (app_env == 'production') | ternary('always', 'on-failure') }}
RestartSec={{ (app_env == 'production') | ternary(5, 1) }}

Environment=NODE_ENV={{ (app_env == 'production') | ternary('production', 'development') }}
Environment=LOG_LEVEL={{ (enable_debug | default(false)) | ternary('debug', 'info') }}

{{ (app_env == 'production') | ternary('LimitNOFILE=65536', '') }}
{{ (app_env == 'production') | ternary('LimitNPROC=4096', '') }}

[Install]
WantedBy=multi-user.target
```

## ternary in Playbook Tasks

The filter works in task parameters too, not just templates:

```yaml
# conditional_tasks.yml - Use ternary in task parameters
- name: Install appropriate package
  ansible.builtin.package:
    name: "{{ (ansible_os_family == 'Debian') | ternary('nginx', 'nginx-mainline') }}"
    state: present

- name: Set appropriate firewall rule
  ansible.posix.firewalld:
    port: "{{ (enable_ssl | default(false)) | ternary('443/tcp', '80/tcp') }}"
    state: enabled
    permanent: true

- name: Configure log rotation
  ansible.builtin.template:
    src: logrotate.j2
    dest: /etc/logrotate.d/myapp
    mode: "{{ (app_env == 'production') | ternary('0644', '0666') }}"
```

## Nested ternary Expressions

You can nest ternary filters for multi-way conditions, though this can get hard to read:

```jinja2
{# Two-level ternary - use sparingly #}
log_level = {{ (app_env == 'production') | ternary('warn', (app_env == 'staging') | ternary('info', 'debug')) }}

{# This is equivalent to:
   if production -> warn
   elif staging -> info
   else -> debug
#}
```

For three or more conditions, a `{% if %}` / `{% elif %}` block is usually clearer:

```jinja2
{# Clearer alternative for multiple conditions #}
{% if app_env == 'production' %}
log_level = warn
{% elif app_env == 'staging' %}
log_level = info
{% else %}
log_level = debug
{% endif %}
```

## Combining ternary with Other Filters

```jinja2
{# ternary combined with default #}
timeout = {{ (service_type | default('http') == 'websocket') | ternary(3600, 60) }}

{# ternary combined with int for type safety #}
max_connections = {{ (app_env == 'production') | ternary(1000, 100) | int }}

{# ternary to choose between two filter chains #}
output = {{ data | ternary(data | to_nice_json, '{}') }}
```

## Docker Compose Generation

```jinja2
{# docker-compose.yml.j2 - Conditional Docker Compose settings #}
version: "3.8"

services:
  app:
    image: {{ app_image }}:{{ app_version }}
    restart: {{ (app_env == 'production') | ternary('always', 'unless-stopped') }}
    ports:
      - "{{ (app_env == 'production') | ternary('127.0.0.1:' ~ app_port ~ ':' ~ app_port, app_port ~ ':' ~ app_port) }}"
    environment:
      NODE_ENV: {{ (app_env == 'production') | ternary('production', 'development') }}
      LOG_FORMAT: {{ (app_env == 'production') | ternary('json', 'pretty') }}
    deploy:
      replicas: {{ (app_env == 'production') | ternary(3, 1) }}
      resources:
        limits:
          memory: {{ (app_env == 'production') | ternary('2G', '512M') }}
          cpus: {{ (app_env == 'production') | ternary("'2.0'", "'0.5'") }}
{% if app_env == 'production' %}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
{% endif %}
```

## Third Argument: None/Undefined Handling

The `ternary` filter also accepts an optional third argument for when the value is `None` or undefined:

```jinja2
{# Three-argument ternary: true_val, false_val, none_val #}
{{ some_variable | ternary("defined_and_true", "defined_and_false", "not_defined") }}
```

This is useful when you need to distinguish between "explicitly false" and "not set at all":

```jinja2
{# Distinguish between false and undefined #}
{{ enable_feature | default(none) | ternary("enabled", "disabled", "not configured") }}
```

## Wrapping Up

The `ternary` filter is the inline conditional expression you reach for when you need simple if/else logic without the overhead of a full `{% if %}` block. It keeps templates compact and readable for straightforward conditions like choosing between two values based on a boolean flag or environment name. For anything beyond a simple two-way (or at most three-way) choice, stick with `{% if %}` blocks for clarity. Used appropriately, `ternary` makes your Ansible templates significantly cleaner.
