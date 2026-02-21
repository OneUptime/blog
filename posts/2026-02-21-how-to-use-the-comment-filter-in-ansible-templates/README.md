# How to Use the comment Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Templates, Jinja2, Configuration Management

Description: Learn how to use the comment filter in Ansible to automatically wrap text in language-specific comment syntax for any configuration format.

---

Every configuration file format has its own comment syntax. Shell scripts use `#`, C-style configs use `//` or `/* */`, XML uses `<!-- -->`, and SQL uses `--`. When generating config files with Ansible templates, you often want to add header comments or inline documentation. The `comment` filter automatically wraps text in the appropriate comment syntax for the target format.

Instead of manually formatting comment blocks in every template, you can let the filter handle it. This keeps your templates cleaner and makes it easy to switch comment styles when needed.

## Basic Usage

By default, the comment filter uses shell-style `#` comments:

```yaml
# Wrap text in shell-style comments
- name: Basic comment filter
  ansible.builtin.debug:
    msg: "{{ 'This file is managed by Ansible' | comment }}"
```

Output:
```
#
# This file is managed by Ansible
#
```

## Specifying Comment Styles

The filter supports several built-in comment styles:

```yaml
# Show different comment styles
- name: Comment style examples
  ansible.builtin.debug:
    msg: |
      --- Shell style (default) ---
      {{ 'Managed by Ansible' | comment }}

      --- C style ---
      {{ 'Managed by Ansible' | comment('c') }}

      --- C block style ---
      {{ 'Managed by Ansible' | comment('cblock') }}

      --- Erlang style ---
      {{ 'Managed by Ansible' | comment('erlang') }}

      --- XML style ---
      {{ 'Managed by Ansible' | comment('xml') }}
```

Output:
```
--- Shell style (default) ---
#
# Managed by Ansible
#

--- C style ---
//
// Managed by Ansible
//

--- C block style ---
/*
 * Managed by Ansible
 */

--- XML style ---
<!--
 - Managed by Ansible
 -->
```

## Custom Comment Characters

You can specify custom prefix, postfix, and decoration characters:

```yaml
# Use custom comment markers
- name: Custom comment style
  ansible.builtin.debug:
    msg: "{{ 'Managed by Ansible' | comment(decoration='; ') }}"
```

Output:
```
;
; Managed by Ansible
;
```

This is useful for formats like INI files that use semicolons for comments.

## Practical Example: Configuration File Headers

The most common use case is adding a management header to generated config files:

```jinja2
{# templates/nginx.conf.j2 - Nginx config with auto-generated header #}
{{ ansible_managed | comment }}

worker_processes {{ ansible_processor_vcpus }};
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name {{ server_name }};
        root {{ document_root }};
    }
}
```

The `ansible_managed` variable is a built-in string that includes the template name, host, and modification time. Wrapping it with the comment filter gives you a clean header block.

## Multi-Line Comment Blocks

The filter handles multi-line text automatically:

```jinja2
{# templates/sshd_config.j2 - SSH config with detailed comment block #}
{% set header = "SSH Configuration
Managed by Ansible - Do not edit manually
Host: " ~ inventory_hostname ~ "
Generated: " ~ ansible_date_time.iso8601 %}
{{ header | comment }}

Port {{ sshd_port | default(22) }}
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Output:
```
#
# SSH Configuration
# Managed by Ansible - Do not edit manually
# Host: web01
# Generated: 2026-02-21T14:30:00Z
#

Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

## Different Formats for Different Files

Use the appropriate comment style for each file type:

```yaml
# Generate config files with appropriate comment styles
- name: Generate Apache config
  ansible.builtin.template:
    src: apache.conf.j2
    dest: /etc/apache2/sites-available/myapp.conf

- name: Generate XML config
  ansible.builtin.template:
    src: log4j2.xml.j2
    dest: /etc/myapp/log4j2.xml

- name: Generate SQL migration
  ansible.builtin.template:
    src: migration.sql.j2
    dest: /tmp/migration.sql
```

Apache config template:

```jinja2
{# templates/apache.conf.j2 - Apache uses hash comments #}
{{ ansible_managed | comment }}

<VirtualHost *:80>
    ServerName {{ server_name }}
    DocumentRoot {{ document_root }}
</VirtualHost>
```

XML config template:

```jinja2
{# templates/log4j2.xml.j2 - XML uses XML-style comments #}
<?xml version="1.0" encoding="UTF-8"?>
{{ ansible_managed | comment('xml') }}
<Configuration status="WARN">
    <Appenders>
        <Console name="Console" target="SYSTEM_OUT">
            <PatternLayout pattern="%d{HH:mm:ss.SSS} [%t] %-5level %logger{36} - %msg%n"/>
        </Console>
    </Appenders>
</Configuration>
```

SQL migration template:

```jinja2
{# templates/migration.sql.j2 - SQL uses double-dash comments #}
{{ ansible_managed | comment(decoration='-- ') }}

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## INI File Comments

For INI-style configuration files that use semicolons:

```jinja2
{# templates/php.ini.j2 - PHP INI uses semicolons for comments #}
{{ ansible_managed | comment(decoration='; ') }}

[PHP]
display_errors = {{ 'On' if php_display_errors else 'Off' }}
error_reporting = {{ php_error_reporting | default('E_ALL & ~E_DEPRECATED') }}
memory_limit = {{ php_memory_limit | default('128M') }}
upload_max_filesize = {{ php_upload_max_filesize | default('2M') }}
```

## Conditional Comment Blocks

You can conditionally include comment sections:

```jinja2
{# templates/app.conf.j2 - Conditional documentation in comments #}
{{ ansible_managed | comment }}

{% if environment == 'development' %}
{{ "DEVELOPMENT CONFIGURATION
Debug mode is enabled.
Additional logging is active.
DO NOT use this configuration in production." | comment }}

{% endif %}
listen_address = {{ listen_address }}
port = {{ app_port }}
debug = {{ 'true' if environment == 'development' else 'false' }}
```

## Documenting Configuration Sections

Use the comment filter to add section documentation:

```jinja2
{# templates/haproxy.cfg.j2 - Documented HAProxy config #}
{{ ansible_managed | comment }}

{{ "Global settings
  maxconn: Maximum concurrent connections
  log: Syslog configuration" | comment }}
global
    maxconn {{ haproxy_maxconn | default(4096) }}
    log /dev/log local0

{{ "Default timeouts and mode settings
  All timeouts are in milliseconds" | comment }}
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

{% for backend in backends %}
{{ ("Backend: " ~ backend.name ~ "\n  Algorithm: " ~ backend.algorithm ~ "\n  Servers: " ~ backend.servers | length | string) | comment }}
backend {{ backend.name }}
    balance {{ backend.algorithm }}
{% for server in backend.servers %}
    server {{ server.name }} {{ server.address }}:{{ server.port }} check
{% endfor %}

{% endfor %}
```

## Using Custom Prefix and Postfix

For full control over the comment block formatting:

```yaml
# Full control over comment block structure
- name: Custom comment block
  ansible.builtin.debug:
    msg: "{{ 'Custom comment' | comment(prefix='###', postfix='###', decoration='# ') }}"
```

## Combining comment with Other Template Logic

```jinja2
{# templates/sudoers.j2 - Sudoers file with documented entries #}
{{ ansible_managed | comment }}

{{ "Root user privileges" | comment }}
root    ALL=(ALL:ALL) ALL

{{ "Service account privileges" | comment }}
{% for user in sudo_users %}
{{ user.name }}    ALL=(ALL) {{ 'NOPASSWD: ' if user.nopasswd | default(false) else '' }}{{ user.commands | join(', ') }}
{% endfor %}
```

## Generating License Headers

For source files that need license headers:

```jinja2
{# templates/main.py.j2 - Python file with license header #}
{{ license_text | comment }}

import os
import sys

def main():
    pass
```

Where `license_text` might be:

```yaml
license_text: |
  Copyright (c) 2026 My Company
  Licensed under the MIT License.
  See LICENSE file in the project root for details.
```

## Summary

The `comment` filter saves you from manually formatting comment blocks in every template. Use `comment()` for shell-style configs, `comment('c')` for C-style, `comment('xml')` for XML, and `comment(decoration='; ')` for INI files. It handles multi-line text automatically, wraps `ansible_managed` cleanly, and keeps your templates focused on the actual configuration rather than comment formatting. Make it a habit to use it at the top of every generated config file so anyone looking at the file knows it is managed by automation.
