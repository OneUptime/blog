# How to Use Jinja2 Variables in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Variables

Description: Learn how to use Jinja2 variables in Ansible templates including variable types, scoping, defaults, and advanced referencing patterns.

---

Every Ansible template is powered by Jinja2, the templating engine that processes `{{ }}` expressions and `{% %}` statements. Variables are the foundation of Jinja2 templates. They let you inject host-specific values, computed results, and configuration parameters into your config files. Understanding how variables work in Jinja2 templates, where they come from, and how to manipulate them is essential for writing effective Ansible templates.

This post covers variable syntax, sources, scoping, defaults, computed values, and advanced patterns for variable usage in Ansible templates.

## Basic Variable Syntax

Variables in Jinja2 are enclosed in double curly braces.

```jinja2
{# templates/app.conf.j2 #}
{# Basic variable substitution #}
[application]
name = {{ app_name }}
port = {{ app_port }}
host = {{ app_host }}
```

When Ansible renders this template, it replaces `{{ app_name }}` with the actual value of the `app_name` variable.

The playbook supplies the variables:

```yaml
# deploy-config.yml
# Provides variables that the template references
- name: Deploy app config
  hosts: webservers
  become: true
  vars:
    app_name: myapp
    app_port: 8080
    app_host: 0.0.0.0
  tasks:
    - name: Generate config file
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        mode: '0644'
```

## Variable Sources

Variables in Ansible templates can come from many places. Here is the priority order (highest to lowest):

1. Extra vars (`-e` command line)
2. Task vars (defined in the task)
3. Block vars
4. Role and include vars
5. Play vars
6. Host facts
7. Host vars
8. Group vars
9. Role defaults

```yaml
# All of these are accessible in templates
- name: Show variable sources
  hosts: webservers
  vars:
    play_var: "from play"
  tasks:
    - name: Deploy with multiple variable sources
      ansible.builtin.template:
        src: config.j2
        dest: /etc/myapp/config.conf
      vars:
        task_var: "from task"
```

```jinja2
{# templates/config.j2 #}
{# Variables from different sources #}
play_variable = {{ play_var }}
task_variable = {{ task_var }}
host_fact = {{ ansible_hostname }}
group_variable = {{ db_host | default('localhost') }}
```

## Accessing Dictionary Variables

When a variable is a dictionary, you can access its keys using dot notation or bracket notation.

```yaml
# Playbook with dictionary variable
vars:
  database:
    host: db.internal
    port: 5432
    name: myapp_production
    credentials:
      username: dbuser
      password: "{{ vault_db_password }}"
```

```jinja2
{# templates/database.conf.j2 #}
{# Accessing nested dictionary values #}
[database]
host = {{ database.host }}
port = {{ database.port }}
name = {{ database.name }}
username = {{ database.credentials.username }}
password = {{ database.credentials.password }}

{# Bracket notation (useful when key contains special characters) #}
host_alt = {{ database['host'] }}
```

Dot notation (`database.host`) is cleaner, but bracket notation (`database['host']`) is required when the key contains hyphens, dots, or starts with a number.

## Accessing List Variables

List elements are accessed by index.

```yaml
vars:
  dns_servers:
    - 8.8.8.8
    - 8.8.4.4
    - 1.1.1.1
```

```jinja2
{# templates/resolv.conf.j2 #}
{# Accessing list elements #}
nameserver {{ dns_servers[0] }}
nameserver {{ dns_servers[1] }}
nameserver {{ dns_servers[2] }}
```

But iterating over the list is usually better than hardcoding indices.

```jinja2
{# Better: iterate over the list #}
{% for server in dns_servers %}
nameserver {{ server }}
{% endfor %}
```

## Default Values

The `default` filter provides a fallback value when a variable is undefined.

```jinja2
{# templates/app.conf.j2 #}
{# Using default values for optional configuration #}
[application]
port = {{ app_port | default(8080) }}
workers = {{ app_workers | default(4) }}
debug = {{ debug_mode | default(false) | lower }}
log_level = {{ log_level | default('info') }}
secret_key = {{ app_secret | default('please-change-me') }}

{# Default with boolean parameter to also catch empty strings #}
custom_header = {{ custom_header | default('X-App-Name', true) }}
```

The `default(value, true)` form also catches empty strings and None values, not just undefined variables.

## Ansible Facts as Variables

All gathered facts are available as variables in templates.

```jinja2
{# templates/system-info.conf.j2 #}
{# Using Ansible facts in templates #}
[system]
hostname = {{ ansible_hostname }}
fqdn = {{ ansible_fqdn }}
os = {{ ansible_distribution }} {{ ansible_distribution_version }}
architecture = {{ ansible_architecture }}
cpus = {{ ansible_processor_vcpus }}
memory_mb = {{ ansible_memtotal_mb }}

[network]
{% for iface in ansible_interfaces %}
{% if iface != 'lo' %}
{{ iface }}_ip = {{ hostvars[inventory_hostname]['ansible_' + iface]['ipv4']['address'] | default('N/A') }}
{% endif %}
{% endfor %}
```

## Computed Variables

You can perform calculations and transformations within the template.

```jinja2
{# templates/postgresql.conf.j2 #}
{# Computing configuration values from facts #}

{# Set shared_buffers to 25% of total RAM #}
shared_buffers = {{ (ansible_memtotal_mb * 0.25) | int }}MB

{# Set effective_cache_size to 75% of total RAM #}
effective_cache_size = {{ (ansible_memtotal_mb * 0.75) | int }}MB

{# Set max_connections based on CPU count #}
max_connections = {{ ansible_processor_vcpus * 50 }}

{# Calculate worker count (minimum 2, maximum CPUs * 2) #}
{% set worker_count = [2, ansible_processor_vcpus * 2] | max %}
parallel_workers = {{ worker_count }}
```

## Variable Scoping with set

The `{% set %}` tag creates template-local variables.

```jinja2
{# templates/nginx.conf.j2 #}
{# Using set to create local variables for readability #}
{% set total_workers = nginx_workers | default(ansible_processor_vcpus) %}
{% set conn_per_worker = nginx_connections_per_worker | default(1024) %}
{% set total_connections = total_workers * conn_per_worker %}

worker_processes {{ total_workers }};

events {
    worker_connections {{ conn_per_worker }};
}

# Total capacity: {{ total_connections }} simultaneous connections
```

Variables created with `set` are only available within the template. They do not affect Ansible variables.

## String Operations

Jinja2 provides rich string manipulation.

```jinja2
{# templates/string-ops.conf.j2 #}
{# String operations on variables #}

{# Convert to uppercase/lowercase #}
app_name_upper = {{ app_name | upper }}
app_name_lower = {{ app_name | lower }}

{# String replacement #}
safe_name = {{ app_name | replace('-', '_') }}

{# Truncate long strings #}
short_desc = {{ description | truncate(50) }}

{# Join a list into a string #}
allowed_hosts = {{ allowed_hosts | join(', ') }}

{# Regex replace #}
sanitized = {{ user_input | regex_replace('[^a-zA-Z0-9]', '') }}
```

## Accessing hostvars

You can access variables from other hosts using `hostvars`.

```jinja2
{# templates/haproxy.cfg.j2 #}
{# Access IP addresses of other hosts in the inventory #}
frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
{% for host in groups['webservers'] %}
    server {{ host }} {{ hostvars[host]['ansible_default_ipv4']['address'] }}:8080 check
{% endfor %}
```

This generates a HAProxy backend configuration with the actual IP addresses of all hosts in the `webservers` group.

## Environment Variables

You can reference environment variables using the `lookup` plugin.

```jinja2
{# templates/env-config.j2 #}
{# Reference environment variables from the control node #}
deploy_user = {{ lookup('env', 'USER') }}
home_dir = {{ lookup('env', 'HOME') }}
```

Note: These are environment variables on the Ansible control node, not on the remote host.

## Vault-Encrypted Variables

Sensitive variables stored in Ansible Vault are used in templates exactly like regular variables.

```yaml
# group_vars/production/vault.yml (encrypted)
vault_db_password: "s3cur3p@ssw0rd"
vault_api_key: "ak_live_abc123xyz"
```

```jinja2
{# templates/secrets.conf.j2 #}
{# Vault variables are used like any other variable #}
[secrets]
database_password = {{ vault_db_password }}
api_key = {{ vault_api_key }}
```

The rendered file on the remote host contains the decrypted values. Make sure to set restrictive permissions.

```yaml
- name: Deploy secrets config
  ansible.builtin.template:
    src: secrets.conf.j2
    dest: /etc/myapp/secrets.conf
    owner: myapp
    group: myapp
    mode: '0600'  # Read/write only for owner
```

## Undefined Variable Handling

You can check if a variable is defined before using it.

```jinja2
{# templates/optional-config.j2 #}
{# Check if variables are defined before using them #}
[required]
app_name = {{ app_name }}

[optional]
{% if proxy_host is defined %}
proxy_host = {{ proxy_host }}
proxy_port = {{ proxy_port | default(3128) }}
{% endif %}

{% if ssl_cert_path is defined and ssl_key_path is defined %}
ssl_certificate = {{ ssl_cert_path }}
ssl_certificate_key = {{ ssl_key_path }}
{% endif %}
```

## Summary

Variables in Jinja2 templates give you the power to generate configuration files that adapt to each host, environment, and role. Variables come from many sources (play vars, task vars, facts, group_vars, host_vars, vault), and you access them with `{{ variable_name }}` syntax. Use `default()` to handle optional variables, dot notation for dictionaries, bracket notation for special keys, and `{% set %}` for template-local computed values. Access facts for system-specific tuning, `hostvars` for cross-host references, and vault variables for secrets. The key principle is to keep your templates readable by using meaningful variable names and adding comments that explain the purpose of each configuration section.
