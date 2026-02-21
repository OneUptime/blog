# How to Use the default Filter in Jinja2 Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Templates

Description: Learn how to use the Jinja2 default filter in Ansible templates to provide fallback values for undefined or empty variables.

---

The `default` filter is one of the most frequently used filters in Ansible templates, and for good reason. It lets you provide a fallback value when a variable is undefined, which means your templates can handle missing data gracefully instead of failing with an error. If you write Ansible playbooks and templates regularly, mastering this filter will make your code more robust and flexible.

## Basic Usage

The syntax is simple. Pipe a variable through the `default` filter and specify the fallback value:

```jinja2
{# Provide a fallback value if http_port is not defined #}
listen {{ http_port | default(80) }};
```

If `http_port` is defined in your inventory or playbook variables, its value is used. If it is not defined at all, the output is `listen 80;`.

You can also use the shorthand alias `d`:

```jinja2
{# The 'd' alias works the same way #}
listen {{ http_port | d(80) }};
```

## Handling Empty Strings and False Values

By default, the `default` filter only triggers on truly undefined variables. If a variable is defined but set to an empty string, `false`, `0`, or `None`, the filter does NOT kick in. This catches many people by surprise.

```yaml
# vars section of a playbook
vars:
  app_name: ""
  debug_mode: false
  max_retries: 0
```

```jinja2
{# These will NOT use the default value because the variables ARE defined #}
app={{ app_name | default("myapp") }}        {# Output: app= (empty string) #}
debug={{ debug_mode | default(true) }}       {# Output: debug=False #}
retries={{ max_retries | default(5) }}       {# Output: retries=0 #}
```

To make the filter also trigger on empty/falsy values, pass `true` as the second argument:

```jinja2
{# With boolean=true, the default applies for empty/falsy values too #}
app={{ app_name | default("myapp", true) }}        {# Output: app=myapp #}
debug={{ debug_mode | default(true, true) }}       {# Output: debug=True #}
retries={{ max_retries | default(5, true) }}       {# Output: retries=5 #}
```

The second argument `true` is often called the "boolean" parameter. When set, any value that evaluates as falsy in Python (empty string, None, False, 0, empty list, empty dict) triggers the default.

## Practical Example: Nginx Configuration

Here is a real-world template for an Nginx virtual host that uses `default` extensively:

```jinja2
{# nginx_vhost.conf.j2 - Virtual host with sensible defaults throughout #}
server {
    listen {{ nginx_listen_port | default(80) }};
    server_name {{ nginx_server_name | default('_') }};

    root {{ nginx_document_root | default('/var/www/html') }};
    index {{ nginx_index_files | default('index.html index.htm') }};

    client_max_body_size {{ nginx_max_body_size | default('10m') }};
    client_body_timeout {{ nginx_body_timeout | default('60s') }};

    access_log /var/log/nginx/{{ nginx_server_name | default('default') }}_access.log {{ nginx_log_format | default('combined') }};
    error_log /var/log/nginx/{{ nginx_server_name | default('default') }}_error.log {{ nginx_error_log_level | default('warn') }};

    location / {
        try_files $uri $uri/ {{ nginx_fallback | default('=404') }};
    }
{% if nginx_proxy_pass is defined %}

    location {{ nginx_proxy_location | default('/api') }} {
        proxy_pass {{ nginx_proxy_pass }};
        proxy_connect_timeout {{ nginx_proxy_connect_timeout | default('30s') }};
        proxy_read_timeout {{ nginx_proxy_read_timeout | default('60s') }};
        proxy_send_timeout {{ nginx_proxy_send_timeout | default('60s') }};
    }
{% endif %}
}
```

The corresponding playbook can specify as few or as many variables as needed:

```yaml
# deploy_nginx.yml - Only override what you need
- name: Deploy Nginx vhost
  hosts: web_servers
  vars:
    nginx_server_name: "app.example.com"
    nginx_proxy_pass: "http://127.0.0.1:3000"
    # Everything else uses defaults from the template
  tasks:
    - name: Render vhost config
      ansible.builtin.template:
        src: nginx_vhost.conf.j2
        dest: /etc/nginx/sites-available/{{ nginx_server_name }}.conf
```

This design pattern gives you a template that works out of the box with minimal configuration but can be fully customized when needed.

## Chaining Defaults

You can chain the `default` filter to create a priority system. Ansible evaluates from left to right, using the first defined value:

```jinja2
{# Check host-specific var first, then group var, then hardcoded fallback #}
timezone={{ host_timezone | default(group_timezone) | default("UTC") }}
```

This pattern is useful when you want to allow overrides at multiple levels of your inventory hierarchy:

```yaml
# host_vars/web1.yml - Host-specific override
host_timezone: "America/New_York"

# group_vars/web_servers.yml - Group-level default
group_timezone: "America/Chicago"
```

If `web1` has `host_timezone` defined, that value is used. If not, it falls back to `group_timezone`. If neither is defined, it defaults to "UTC".

## Using default with Complex Data Types

The `default` filter works with any data type, not just strings and numbers:

```jinja2
{# Default to an empty list if packages is not defined #}
{% for pkg in packages | default([]) %}
- {{ pkg }}
{% endfor %}

{# Default to an empty dict if config is not defined #}
{% for key, value in config | default({}) | dictsort %}
{{ key }}={{ value }}
{% endfor %}
```

This is particularly useful for loops. Without the `default([])`, an undefined `packages` variable would cause the template to fail. With it, the loop simply produces no output.

## default in Conditional Expressions

You can combine `default` with conditionals for more sophisticated logic:

```jinja2
{# Use default inside a conditional expression #}
{% if (enable_ssl | default(false)) %}
    listen 443 ssl;
    ssl_certificate {{ ssl_cert_path | default('/etc/ssl/certs/server.crt') }};
    ssl_certificate_key {{ ssl_key_path | default('/etc/ssl/private/server.key') }};
{% else %}
    listen 80;
{% endif %}
```

You can also use `default` in `when` conditions within your playbooks:

```yaml
# Only install optional packages if the list is defined
- name: Install optional packages
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: "{{ optional_packages | default([]) }}"
  when: optional_packages is defined
```

## Using omit as a Default Value

Ansible provides a special `omit` variable that can be used with `default` to skip module parameters entirely:

```yaml
# deploy_app.yml - Use omit to conditionally skip parameters
- name: Create application user
  ansible.builtin.user:
    name: "{{ app_user }}"
    shell: "{{ app_shell | default('/bin/bash') }}"
    home: "{{ app_home | default(omit) }}"
    uid: "{{ app_uid | default(omit) }}"
    groups: "{{ app_groups | default(omit) }}"
```

When `app_uid` is not defined, `default(omit)` tells Ansible to not pass the `uid` parameter to the `user` module at all, as if you never wrote it. This is different from passing an empty string or None, which would cause errors.

## A Complete Application Configuration Example

Here is a comprehensive template for an application configuration file that demonstrates various `default` filter patterns:

```jinja2
{# app_config.yml.j2 - Application configuration with extensive defaults #}
app:
  name: {{ app_name | default("myservice") }}
  version: {{ app_version | default("latest") }}
  environment: {{ app_env | default("production") }}

server:
  host: {{ server_host | default("0.0.0.0") }}
  port: {{ server_port | default(8080) }}
  workers: {{ server_workers | default(ansible_processor_vcpus | default(2)) }}
  max_connections: {{ server_max_connections | default(1000) }}

database:
  host: {{ db_host | default("localhost") }}
  port: {{ db_port | default(5432) }}
  name: {{ db_name | default(app_name | default("myservice")) }}
  pool_size: {{ db_pool_size | default(10) }}
  pool_timeout: {{ db_pool_timeout | default(30) }}

cache:
  enabled: {{ cache_enabled | default(true) }}
  backend: {{ cache_backend | default("redis") }}
  host: {{ cache_host | default("localhost") }}
  port: {{ cache_port | default(6379) }}
  ttl: {{ cache_ttl | default(3600) }}

logging:
  level: {{ log_level | default("INFO") }}
  format: {{ log_format | default("json") }}
  output: {{ log_output | default("stdout") }}
{% for key, value in (extra_config | default({})) | dictsort %}
  {{ key }}: {{ value }}
{% endfor %}
```

Notice the nested default on the `workers` line: it first tries `server_workers`, then falls back to the number of CPU cores from Ansible facts, and finally defaults to 2 if facts are not available.

## Common Mistakes to Avoid

One frequent error is quoting the default value when you want a number:

```jinja2
{# Wrong - this produces the string "80" instead of the number 80 #}
port: {{ port | default("80") }}

{# Right - this produces the number 80 #}
port: {{ port | default(80) }}
```

Another mistake is forgetting that `default` does not catch empty strings by default:

```jinja2
{# This may produce an empty line if hostname is set to "" #}
hostname={{ hostname | default("localhost") }}

{# Use the boolean flag if empty strings should trigger the default #}
hostname={{ hostname | default("localhost", true) }}
```

## Wrapping Up

The `default` filter is a small but essential piece of writing defensive Ansible templates. It lets you define sensible fallbacks, handle missing variables gracefully, chain through priority levels of configuration, and use `omit` to conditionally skip module parameters. Get in the habit of using it for any variable that might not be set, and your playbooks and templates will be much more portable and resilient across different environments and inventory setups.
