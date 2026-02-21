# How to Use Role Templates in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Templates, Jinja2

Description: Master Ansible role templates with Jinja2 including loops, conditionals, filters, and practical configuration file examples.

---

Templates are where Ansible gets really powerful. Instead of copying static configuration files, you write Jinja2 templates that get rendered with your role's variables at deploy time. Every host can end up with a unique configuration file built from the same template. Inside a role, templates live in the `templates/` directory and are automatically found by the `template` module without needing full paths. This post covers everything from basic variable substitution to advanced Jinja2 patterns.

## Where Templates Live in a Role

The `templates/` directory sits alongside `tasks/`, `handlers/`, and the rest:

```
roles/
  webserver/
    templates/
      nginx.conf.j2
      vhost.conf.j2
      logrotate.j2
    tasks/
      main.yml
```

When you use the `template` module inside a role, Ansible looks in `templates/` first. You reference files by name, not by path:

```yaml
# roles/webserver/tasks/main.yml
# Ansible automatically looks in roles/webserver/templates/ for the source file
---
- name: Deploy Nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: Reload Nginx
```

## Basic Variable Substitution

The simplest template usage is dropping variable values into a configuration file:

```jinja2
{# roles/webserver/templates/nginx.conf.j2 #}
{# Basic configuration with variable substitution #}
worker_processes {{ webserver_worker_processes | default('auto') }};
pid /run/nginx.pid;

events {
    worker_connections {{ webserver_worker_connections }};
}

http {
    sendfile on;
    tcp_nopush on;
    keepalive_timeout {{ webserver_keepalive_timeout }};

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

The `{{ }}` delimiters contain Jinja2 expressions that get replaced with variable values. The `| default('auto')` filter provides a fallback if the variable is not defined.

## Conditionals in Templates

Use `{% if %}` blocks to include or exclude sections based on variables:

```jinja2
{# roles/webserver/templates/vhost.conf.j2 #}
{# Virtual host with optional TLS configuration #}
server {
    listen {{ webserver_port }};
    server_name {{ webserver_server_name }};

{% if webserver_enable_tls %}
    listen {{ webserver_tls_port | default(443) }} ssl;
    ssl_certificate {{ webserver_tls_cert }};
    ssl_certificate_key {{ webserver_tls_key }};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
{% endif %}

    root {{ webserver_document_root }};
    index index.html index.htm;

{% if webserver_enable_gzip %}
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1024;
{% endif %}

    location / {
        try_files $uri $uri/ =404;
    }

{% if webserver_proxy_pass is defined %}
    location /api {
        proxy_pass {{ webserver_proxy_pass }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
{% endif %}
}
```

## Loops in Templates

Use `{% for %}` to iterate over lists and dictionaries:

```jinja2
{# roles/loadbalancer/templates/haproxy.cfg.j2 #}
{# HAProxy configuration with dynamic backend servers #}
global
    maxconn {{ haproxy_maxconn }}
    log /dev/log local0

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend http_front
    bind *:{{ haproxy_frontend_port }}
    default_backend http_back

backend http_back
    balance {{ haproxy_balance_algorithm | default('roundrobin') }}
{% for server in haproxy_backend_servers %}
    server {{ server.name }} {{ server.address }}:{{ server.port }} check{% if server.weight is defined %} weight {{ server.weight }}{% endif %}

{% endfor %}
```

With these defaults:

```yaml
# roles/loadbalancer/defaults/main.yml
---
haproxy_maxconn: 4096
haproxy_frontend_port: 80
haproxy_balance_algorithm: roundrobin
haproxy_backend_servers:
  - name: app01
    address: 10.0.1.10
    port: 8080
  - name: app02
    address: 10.0.1.11
    port: 8080
    weight: 2
  - name: app03
    address: 10.0.1.12
    port: 8080
```

The rendered output would be:

```
backend http_back
    balance roundrobin
    server app01 10.0.1.10:8080 check
    server app02 10.0.1.11:8080 check weight 2
    server app03 10.0.1.12:8080 check
```

## Using Ansible Facts in Templates

Templates have access to all Ansible facts, not just role variables:

```jinja2
{# roles/monitoring/templates/node_exporter.yml.j2 #}
{# System-aware configuration using Ansible facts #}
# Auto-generated by Ansible on {{ ansible_date_time.iso8601 }}
# Host: {{ ansible_hostname }}
# OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
# CPU: {{ ansible_processor_vcpus }} cores
# RAM: {{ ansible_memtotal_mb }} MB

server:
  hostname: {{ ansible_fqdn }}
  listen_address: {{ ansible_default_ipv4.address }}:9100
```

## Jinja2 Filters

Ansible provides a rich set of filters for transforming data in templates:

```jinja2
{# roles/app/templates/env.j2 #}
{# Environment file with various Jinja2 filters #}

# String manipulation
APP_NAME={{ app_name | upper }}
APP_SLUG={{ app_name | lower | replace(' ', '-') }}

# Default values
LOG_LEVEL={{ app_log_level | default('info') }}

# JSON encoding for complex values
ALLOWED_HOSTS={{ app_allowed_hosts | to_json }}

# Math operations
WORKER_COUNT={{ ansible_processor_vcpus * 2 }}

# IP address formatting
BIND_ADDRESS={{ app_bind_address | default(ansible_default_ipv4.address) }}

# Base64 encoding
API_KEY={{ app_api_key | b64encode }}
```

## Template Subdirectories

For roles with many templates, you can use subdirectories:

```
roles/webserver/templates/
  nginx/
    nginx.conf.j2
    mime.types.j2
  sites/
    default.conf.j2
    proxy.conf.j2
  logrotate/
    nginx.j2
```

Reference them with the subdirectory path:

```yaml
# roles/webserver/tasks/main.yml
# Reference templates in subdirectories
---
- name: Deploy main Nginx config
  ansible.builtin.template:
    src: nginx/nginx.conf.j2
    dest: /etc/nginx/nginx.conf

- name: Deploy logrotate config
  ansible.builtin.template:
    src: logrotate/nginx.j2
    dest: /etc/logrotate.d/nginx
```

## Generating Multiple Files from a Template

Combine loops in tasks with templates to generate multiple configuration files:

```yaml
# roles/webserver/tasks/main.yml
# Generate a separate config file for each virtual host
---
- name: Deploy virtual host configurations
  ansible.builtin.template:
    src: sites/vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.name }}.conf"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ webserver_virtual_hosts }}"
  notify: Reload Nginx
```

```yaml
# roles/webserver/defaults/main.yml
---
webserver_virtual_hosts:
  - name: app1
    server_name: app1.example.com
    port: 80
    root: /var/www/app1
  - name: app2
    server_name: app2.example.com
    port: 80
    root: /var/www/app2
```

```jinja2
{# roles/webserver/templates/sites/vhost.conf.j2 #}
{# Template used in a loop - "item" comes from the loop variable #}
server {
    listen {{ item.port }};
    server_name {{ item.server_name }};
    root {{ item.root }};

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## Template Validation

The `template` module supports a `validate` parameter that runs a command against the rendered file before deploying it:

```yaml
# Validate the rendered template before putting it in place
- name: Deploy Nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    validate: "nginx -t -c %s"
  notify: Reload Nginx

- name: Deploy sudoers file
  ansible.builtin.template:
    src: sudoers.j2
    dest: /etc/sudoers.d/myapp
    validate: "visudo -cf %s"
    mode: '0440'
```

The `%s` is replaced with the path to the temporary rendered file. If the validation command returns a non-zero exit code, the file is not deployed.

## Whitespace Control

Jinja2's whitespace handling can produce ugly output with extra blank lines. Use the `-` modifier to strip whitespace:

```jinja2
{# Without whitespace control - produces blank lines #}
{% if app_features %}
{% for feature in app_features %}
{{ feature }}=true
{% endfor %}
{% endif %}

{# With whitespace control - clean output #}
{%- if app_features %}
{%- for feature in app_features %}
{{ feature }}=true
{%- endfor %}
{%- endif %}
```

## Wrapping Up

Templates transform Ansible roles from simple file copiers into intelligent configuration generators. The `templates/` directory in a role is automatically searched by the `template` module, Jinja2 gives you conditionals, loops, and filters for dynamic content, and the `validate` parameter catches errors before they cause outages. Master these patterns and you will be able to generate any configuration file from a single template, no matter how many hosts or environments you are managing.
