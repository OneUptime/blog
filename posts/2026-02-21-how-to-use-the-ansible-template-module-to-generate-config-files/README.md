# How to Use the Ansible template Module to Generate Config Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Templates, Configuration Management, Jinja2

Description: Learn how to use the Ansible template module with Jinja2 to generate dynamic configuration files for services like Nginx, PostgreSQL, and systemd.

---

Configuration files are the backbone of every service running on your infrastructure. Nginx needs its `nginx.conf`, PostgreSQL needs `postgresql.conf`, and your application needs its own settings files. Manually editing these files on each server is a recipe for drift and mistakes. The Ansible `template` module lets you define configuration files as Jinja2 templates with variables, loops, and conditionals, then renders them onto your managed hosts with the right values for each environment.

This post covers how the template module works, how to structure your templates, and practical examples for common infrastructure services.

## How the Template Module Works

The `template` module takes a Jinja2 template file from the control node, processes it through the Jinja2 engine (replacing variables, evaluating expressions), and writes the rendered output to a file on the managed host.

```yaml
# basic-template.yml
# Renders a Jinja2 template to a configuration file on the remote host
- name: Deploy application configuration
  hosts: webservers
  become: true
  vars:
    app_name: myapp
    app_port: 8080
    app_workers: 4
    debug_mode: false
  tasks:
    - name: Generate application config
      ansible.builtin.template:
        src: templates/app.conf.j2
        dest: /etc/myapp/app.conf
        owner: root
        group: root
        mode: '0644'
      notify: Restart application

  handlers:
    - name: Restart application
      ansible.builtin.service:
        name: myapp
        state: restarted
```

The template file uses Jinja2 syntax to reference Ansible variables.

```jinja2
{# templates/app.conf.j2 #}
{# Application configuration file - managed by Ansible #}
[application]
name = {{ app_name }}
port = {{ app_port }}
workers = {{ app_workers }}
debug = {{ debug_mode | lower }}

[logging]
level = {{ 'DEBUG' if debug_mode else 'INFO' }}
file = /var/log/{{ app_name }}/app.log
```

## Template Search Path

Ansible looks for templates in specific locations depending on your project structure.

In a playbook directory:
- `templates/` subdirectory relative to the playbook

In a role:
- `roles/<role_name>/templates/`

You can specify the full path if your template is elsewhere.

```yaml
# Explicit path to template
- name: Generate config from specific path
  ansible.builtin.template:
    src: /opt/ansible/custom-templates/nginx.conf.j2
    dest: /etc/nginx/nginx.conf
```

## Generating Nginx Configuration

Here is a complete example for an Nginx configuration template.

```yaml
# nginx-config.yml
# Deploys a customized Nginx configuration
- name: Configure Nginx
  hosts: webservers
  become: true
  vars:
    nginx_worker_processes: "{{ ansible_processor_vcpus }}"
    nginx_worker_connections: 1024
    nginx_keepalive_timeout: 65
    nginx_client_max_body_size: "10m"
    upstream_servers:
      - { host: "127.0.0.1", port: 8080, weight: 3 }
      - { host: "127.0.0.1", port: 8081, weight: 2 }
      - { host: "127.0.0.1", port: 8082, weight: 1 }
    server_name: app.example.com
  tasks:
    - name: Deploy Nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        mode: '0644'
        validate: "nginx -t -c %s"
      notify: Reload Nginx

  handlers:
    - name: Reload Nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

```jinja2
{# templates/nginx.conf.j2 #}
{# Nginx main configuration - managed by Ansible #}
user www-data;
worker_processes {{ nginx_worker_processes }};
pid /run/nginx.pid;

events {
    worker_connections {{ nginx_worker_connections }};
}

http {
    sendfile on;
    keepalive_timeout {{ nginx_keepalive_timeout }};
    client_max_body_size {{ nginx_client_max_body_size }};

    upstream backend {
{% for server in upstream_servers %}
        server {{ server.host }}:{{ server.port }} weight={{ server.weight }};
{% endfor %}
    }

    server {
        listen 80;
        server_name {{ server_name }};

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

The `validate` parameter runs `nginx -t` against the rendered file before deploying it. If the syntax check fails, the task fails and the old config stays in place.

## Generating systemd Unit Files

systemd service files are another common use case for templates.

```yaml
# systemd-template.yml
# Generates a systemd service file from a template
- name: Deploy systemd service
  hosts: appservers
  become: true
  vars:
    service_name: myapi
    service_user: deploy
    service_group: deploy
    service_exec: /opt/myapi/bin/server
    service_working_dir: /opt/myapi
    service_env:
      PORT: "8080"
      DATABASE_URL: "postgresql://db.internal:5432/myapi"
      REDIS_URL: "redis://cache.internal:6379"
      LOG_LEVEL: "info"
  tasks:
    - name: Create systemd unit file
      ansible.builtin.template:
        src: systemd-service.j2
        dest: "/etc/systemd/system/{{ service_name }}.service"
        mode: '0644'
      notify:
        - Reload systemd
        - Restart service

  handlers:
    - name: Reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: Restart service
      ansible.builtin.service:
        name: "{{ service_name }}"
        state: restarted
```

```jinja2
{# templates/systemd-service.j2 #}
{# Systemd unit file - managed by Ansible #}
[Unit]
Description={{ service_name }}
After=network.target

[Service]
Type=simple
User={{ service_user }}
Group={{ service_group }}
WorkingDirectory={{ service_working_dir }}
ExecStart={{ service_exec }}
Restart=always
RestartSec=5
{% for key, value in service_env.items() %}
Environment="{{ key }}={{ value }}"
{% endfor %}

[Install]
WantedBy=multi-user.target
```

## Template Module Parameters

The template module supports several useful parameters.

```yaml
# Full parameter usage
- name: Deploy config with all options
  ansible.builtin.template:
    src: config.j2                    # Template source (required)
    dest: /etc/myapp/config.conf      # Destination path (required)
    owner: root                       # File owner
    group: root                       # File group
    mode: '0644'                      # File permissions
    backup: true                      # Create backup before overwriting
    validate: "/usr/sbin/sshd -t -f %s"  # Validate before deploying
    force: true                       # Overwrite even if content is same
    newline_sequence: "\n"            # Line endings (default: \n)
```

The `backup: true` parameter creates a timestamped backup of the existing file before overwriting it. This is useful for auditing changes.

## Using ansible_managed

It is good practice to include a comment indicating the file is managed by Ansible.

```jinja2
{# templates/config.j2 #}
# {{ ansible_managed }}
# Do not edit this file manually. Changes will be overwritten.

[application]
name = {{ app_name }}
port = {{ app_port }}
```

The `ansible_managed` variable produces a string like: `Ansible managed: templates/config.j2 modified on 2026-02-21 by deploy`.

## Environment-Specific Configuration

Use group variables to make templates render differently per environment.

```yaml
# group_vars/production.yml
db_host: db-prod.internal
db_pool_size: 25
cache_ttl: 3600
log_level: warn

# group_vars/staging.yml
db_host: db-staging.internal
db_pool_size: 5
cache_ttl: 60
log_level: debug
```

```jinja2
{# templates/database.conf.j2 #}
{# Database configuration - values vary by environment #}
[database]
host = {{ db_host }}
port = 5432
pool_size = {{ db_pool_size }}

[cache]
ttl = {{ cache_ttl }}

[logging]
level = {{ log_level }}
```

The same template renders different values depending on which group the host belongs to.

## PostgreSQL Configuration Example

```yaml
# postgresql-config.yml
# Deploys a tuned PostgreSQL configuration
- name: Configure PostgreSQL
  hosts: dbservers
  become: true
  vars:
    pg_shared_buffers: "{{ (ansible_memtotal_mb * 0.25) | int }}MB"
    pg_effective_cache_size: "{{ (ansible_memtotal_mb * 0.75) | int }}MB"
    pg_work_mem: "64MB"
    pg_max_connections: 200
    pg_listen_addresses: "*"
  tasks:
    - name: Deploy postgresql.conf
      ansible.builtin.template:
        src: postgresql.conf.j2
        dest: /etc/postgresql/14/main/postgresql.conf
        owner: postgres
        group: postgres
        mode: '0644'
      notify: Restart PostgreSQL
```

```jinja2
{# templates/postgresql.conf.j2 #}
{# PostgreSQL configuration - tuned for {{ ansible_memtotal_mb }}MB RAM #}
listen_addresses = '{{ pg_listen_addresses }}'
max_connections = {{ pg_max_connections }}

shared_buffers = {{ pg_shared_buffers }}
effective_cache_size = {{ pg_effective_cache_size }}
work_mem = {{ pg_work_mem }}

wal_level = replica
max_wal_senders = 5

logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 1000
```

Notice how `pg_shared_buffers` is calculated dynamically based on the host's actual memory using `ansible_memtotal_mb`.

## Handling Template Errors

When a template has syntax errors, Ansible reports the error with the template filename and line number. Common issues include undefined variables and incorrect Jinja2 syntax.

```yaml
# Provide defaults for optional variables
- name: Deploy config with safe defaults
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
```

```jinja2
{# Use default filter to handle potentially undefined variables #}
[application]
port = {{ app_port | default(8080) }}
workers = {{ app_workers | default(ansible_processor_vcpus) }}
debug = {{ debug_mode | default(false) | lower }}
secret_key = {{ app_secret | default('change-me-in-production') }}
```

The `default()` filter prevents "undefined variable" errors by providing fallback values.

## Summary

The Ansible `template` module is fundamental to configuration management. It renders Jinja2 templates with host-specific variables and deploys them as configuration files. Use it for Nginx configs, systemd unit files, database configurations, and any file that needs dynamic values. Always use `validate` when available to catch syntax errors before deployment. Store environment-specific values in group variables so the same template works across production, staging, and development. Include `ansible_managed` comments so anyone editing the file on the server knows it is automated. Use `backup: true` for critical configs to keep a safety net.
