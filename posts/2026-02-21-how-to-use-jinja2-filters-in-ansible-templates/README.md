# How to Use Jinja2 Filters in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Templates

Description: Learn how to use Jinja2 filters in Ansible templates to transform, format, and manipulate data for dynamic configuration file generation.

---

Jinja2 filters are the data transformation layer in Ansible templates. They take a variable value and transform it: converting types, formatting strings, filtering lists, computing hashes, encoding data, and much more. Filters use the pipe (`|`) syntax, and you can chain multiple filters together to build complex transformations in a single expression.

This post covers the most useful Jinja2 and Ansible-specific filters for template work, organized by category with practical configuration file examples.

## Filter Syntax

Filters use the pipe operator. The value on the left is passed as input to the filter on the right.

```jinja2
{# Basic filter syntax #}
{{ variable | filter_name }}

{# Filter with arguments #}
{{ variable | filter_name(arg1, arg2) }}

{# Chained filters (left to right) #}
{{ variable | filter1 | filter2 | filter3 }}
```

## String Filters

String manipulation is one of the most common needs in templates.

```jinja2
{# templates/string-filters.conf.j2 #}
{# Demonstrating string filters #}

{# Case conversion #}
app_name_upper = {{ app_name | upper }}
app_name_lower = {{ app_name | lower }}
app_name_title = {{ app_name | title }}
app_name_capitalize = {{ app_name | capitalize }}

{# String replacement #}
safe_name = {{ app_name | replace('-', '_') }}
url_safe = {{ app_name | urlencode }}

{# Whitespace handling #}
trimmed = {{ user_input | trim }}

{# Truncation #}
short_desc = {{ description | truncate(80, true, '...') }}

{# Padding #}
padded = {{ count | string | center(10) }}

{# Regular expression #}
cleaned = {{ raw_input | regex_replace('[^a-zA-Z0-9_-]', '') }}

{# String wrapping #}
wrapped = {{ long_text | wordwrap(72) }}
```

## Default Values

The `default` filter is essential for handling optional variables.

```jinja2
{# templates/defaults.conf.j2 #}
{# Using default for robust configuration #}
[application]
port = {{ app_port | default(8080) }}
host = {{ app_host | default('0.0.0.0') }}
workers = {{ app_workers | default(ansible_processor_vcpus | default(2)) }}
debug = {{ debug_mode | default(false) | lower }}

{# default(value, true) also catches empty strings and None #}
admin_email = {{ admin_email | default('admin@example.com', true) }}

{# Combining with other filters #}
log_level = {{ log_level | default('info') | upper }}
```

## Number Filters

Numeric transformations for configuration tuning.

```jinja2
{# templates/tuning.conf.j2 #}
{# Numeric calculations and formatting #}

{# Integer conversion #}
max_connections = {{ (ansible_memtotal_mb / 4) | int }}

{# Rounding #}
cache_size_gb = {{ (ansible_memtotal_mb / 1024) | round(1) }}

{# Absolute value #}
offset = {{ adjustment | abs }}

{# Min and max #}
workers = {{ [2, ansible_processor_vcpus] | max }}
pool_size = {{ [100, (ansible_memtotal_mb / 10) | int] | min }}

{# Human readable file sizes #}
max_upload = {{ max_upload_bytes | human_readable }}

{# Formatting #}
percentage = {{ (used / total * 100) | round(2) }}%
```

## List Filters

Filters for transforming lists are crucial for generating multi-line configuration sections.

```jinja2
{# templates/list-filters.conf.j2 #}
{# List manipulation filters #}

{# Join list into string #}
allowed_hosts = {{ allowed_hosts | join(', ') }}

{# Sort a list #}
{% for pkg in packages | sort %}
install {{ pkg }}
{% endfor %}

{# Unique items only #}
{% for port in (all_ports | unique | sort) %}
listen {{ port }}
{% endfor %}

{# First and last elements #}
primary_dns = {{ dns_servers | first }}
fallback_dns = {{ dns_servers | last }}

{# List length #}
# Total servers: {{ server_list | length }}

{# Reverse a list #}
{% for item in shutdown_order | reverse %}
stop {{ item }}
{% endfor %}

{# Flatten nested lists #}
{% for item in nested_list | flatten %}
process {{ item }}
{% endfor %}

{# Random element (useful for load distribution) #}
preferred_mirror = {{ mirrors | random }}
```

## Dictionary Filters

Working with dictionaries in templates.

```jinja2
{# templates/dict-filters.conf.j2 #}
{# Dictionary manipulation #}

{# Iterate sorted dictionary keys #}
{% for key in config_dict | sort %}
{{ key }} = {{ config_dict[key] }}
{% endfor %}

{# Convert dict to key-value pairs #}
{% for item in settings | dict2items %}
{{ item.key }}={{ item.value }}
{% endfor %}

{# Merge dictionaries #}
{% set merged = default_config | combine(override_config) %}
{% for key, value in merged.items() %}
{{ key }} = {{ value }}
{% endfor %}

{# Select specific keys #}
{% for item in full_config | dict2items | selectattr('key', 'in', ['host', 'port', 'name']) %}
{{ item.key }} = {{ item.value }}
{% endfor %}
```

## Data Format Filters

Converting between data formats.

```jinja2
{# templates/format-filters.conf.j2 #}
{# Data format conversions #}

{# To JSON #}
config_json = {{ config_dict | to_json }}

{# To pretty JSON #}
{# config_json = {{ config_dict | to_nice_json(indent=2) }} #}

{# To YAML #}
{# {{ config_dict | to_nice_yaml }} #}

{# From JSON string #}
{% set parsed = json_string | from_json %}

{# Boolean to string #}
enabled = {{ feature_flag | bool | lower }}
enabled_yes_no = {{ feature_flag | bool | ternary('yes', 'no') }}
```

## The ternary Filter

A concise way to choose between two values.

```jinja2
{# templates/ternary.conf.j2 #}
{# Using ternary for inline conditionals #}
[application]
debug = {{ debug_mode | ternary('on', 'off') }}
log_level = {{ debug_mode | ternary('DEBUG', 'WARN') }}
ssl = {{ ssl_enabled | ternary('required', 'disabled') }}
protocol = {{ ssl_enabled | ternary('https', 'http') }}
workers = {{ (environment == 'production') | ternary(8, 2) }}
```

The `ternary` filter works like `value_if_true if condition else value_if_false`.

## Hash and Encoding Filters

For security-related configurations.

```jinja2
{# templates/security.conf.j2 #}
{# Hash and encoding operations #}

{# SHA256 hash #}
config_hash = {{ config_content | hash('sha256') }}

{# MD5 hash (for checksums, not security) #}
file_checksum = {{ file_content | hash('md5') }}

{# Base64 encoding #}
encoded_secret = {{ api_secret | b64encode }}

{# Base64 decoding #}
decoded = {{ encoded_value | b64decode }}

{# Password hash (for /etc/shadow) #}
{# password_hash = {{ user_password | password_hash('sha512') }} #}

{# URL encoding #}
encoded_param = {{ search_query | urlencode }}
```

## Path Filters

Working with file paths.

```jinja2
{# templates/path-filters.conf.j2 #}
{# Path manipulation #}

{# Extract filename from path #}
filename = {{ file_path | basename }}

{# Extract directory from path #}
directory = {{ file_path | dirname }}

{# Get file extension #}
extension = {{ file_path | splitext | last }}

{# Expand user home directory #}
home = {{ '~' | expanduser }}

{# Resolve real path #}
real_path = {{ symlink_path | realpath }}
```

## IP Address Filters

Ansible provides specialized IP address filters.

```jinja2
{# templates/network.conf.j2 #}
{# IP address manipulation #}

{# Validate IP address #}
{% if primary_ip | ansible.utils.ipaddr %}
bind_address = {{ primary_ip }}
{% endif %}

{# Get network address #}
network = {{ '10.0.1.15/24' | ansible.utils.ipaddr('network') }}

{# Get broadcast address #}
broadcast = {{ '10.0.1.15/24' | ansible.utils.ipaddr('broadcast') }}

{# Convert CIDR to netmask #}
netmask = {{ '10.0.1.0/24' | ansible.utils.ipaddr('netmask') }}

{# Filter list for valid IPv4 addresses only #}
{% for ip in mixed_addresses | ansible.utils.ipv4 %}
nameserver {{ ip }}
{% endfor %}
```

Note: IP address filters require the `ansible.utils` collection.

## Practical Example: Complete Nginx Template

Here is a realistic template that uses many filters together.

```jinja2
{# templates/nginx-complete.conf.j2 #}
{# {{ ansible_managed }} #}
user {{ nginx_user | default('www-data') }};
worker_processes {{ nginx_workers | default(ansible_processor_vcpus | default(2)) }};
pid /run/nginx.pid;

events {
    worker_connections {{ nginx_worker_connections | default(1024) }};
}

http {
    sendfile on;
    keepalive_timeout {{ nginx_keepalive | default(65) }};
    client_max_body_size {{ nginx_max_body | default('10m') }};

    log_format main '{{ nginx_log_format | default("$remote_addr - $remote_user [$time_local] \"$request\" $status $body_bytes_sent") }}';

{% if nginx_upstreams is defined %}
{% for upstream in nginx_upstreams %}
    upstream {{ upstream.name | lower | replace(' ', '_') }} {
        {{ upstream.method | default('round_robin') }};
{% for server in upstream.servers | sort(attribute='host') %}
        server {{ server.host }}:{{ server.port | default(80) }}{{ ' weight=' + (server.weight | string) if server.weight is defined else '' }};
{% endfor %}
    }

{% endfor %}
{% endif %}

{% for vhost in nginx_vhosts | default([]) | sort(attribute='server_name') %}
    server {
        listen {{ vhost.listen | default('80') }};
        server_name {{ vhost.server_name | join(' ') if vhost.server_name is iterable and vhost.server_name is not string else vhost.server_name }};

        root {{ vhost.root | default('/var/www/' + (vhost.server_name | first if vhost.server_name is iterable else vhost.server_name) | replace('.', '_')) }};

{% if vhost.locations is defined %}
{% for location in vhost.locations %}
        location {{ location.path }} {
{% if location.proxy_pass is defined %}
            proxy_pass {{ location.proxy_pass }};
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
{% elif location.alias is defined %}
            alias {{ location.alias }};
{% endif %}
{% if location.expires is defined %}
            expires {{ location.expires }};
{% endif %}
        }

{% endfor %}
{% endif %}
    }

{% endfor %}
}
```

## Chaining Filters

The real power comes from chaining multiple filters.

```jinja2
{# Complex filter chains #}

{# Get unique sorted list of ports as strings #}
ports = {{ all_ports | unique | sort | map('string') | join(', ') }}

{# Extract active server IPs from a complex structure #}
{% for ip in servers | selectattr('status', 'equalto', 'active') | map(attribute='ip') | sort %}
allow {{ ip }};
{% endfor %}

{# Generate safe config key from arbitrary string #}
{{ raw_key | lower | replace(' ', '_') | regex_replace('[^a-z0-9_]', '') | truncate(32, true, '') }}
```

## Summary

Jinja2 filters are the transformation toolkit for Ansible templates. String filters handle case conversion, replacement, and formatting. Number filters handle math and rounding. List filters handle sorting, joining, deduplication, and selection. Dictionary filters handle merging and iteration. Data format filters convert between JSON, YAML, and native types. The `default` filter prevents undefined variable errors, `ternary` provides concise conditional values, and `combine` merges dictionaries. Chaining filters with the pipe operator lets you build complex transformations in a single readable expression. Learn the core filters and your templates will handle any configuration format you encounter.
