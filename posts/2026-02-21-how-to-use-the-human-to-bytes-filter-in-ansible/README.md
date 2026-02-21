# How to Use the human_to_bytes Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Storage, Configuration Management, DevOps

Description: Learn how to use the human_to_bytes filter in Ansible to convert human-readable sizes like 2GB into byte values for configuration templates.

---

When humans write configuration files, we use values like "512MB" or "2GB" because they are easy to read and understand. But many applications and system configurations expect values in raw bytes. The `human_to_bytes` filter in Ansible bridges this gap by converting human-readable size strings into their byte equivalents.

This is the inverse of the `human_readable` filter. Together, they let you work with storage and memory values in whatever format is most convenient at each stage of your automation.

## Basic Usage

```yaml
# Convert human-readable sizes to byte values
- name: Convert to bytes
  ansible.builtin.debug:
    msg: |
      1 KB = {{ "1KB" | human_to_bytes }}
      1 MB = {{ "1MB" | human_to_bytes }}
      1 GB = {{ "1GB" | human_to_bytes }}
      1 TB = {{ "1TB" | human_to_bytes }}
      512 MB = {{ "512MB" | human_to_bytes }}
      2.5 GB = {{ "2.5GB" | human_to_bytes }}
```

Output:
```
1 KB = 1024
1 MB = 1048576
1 GB = 1073741824
1 TB = 1099511627776
512 MB = 536870912
2.5 GB = 2684354560
```

## Why This Filter Matters

Consider a scenario where you define resource limits in a readable format but need to pass them to applications that expect bytes:

```yaml
# Define limits in human-readable format
resource_limits:
  max_memory: "4GB"
  max_upload_size: "100MB"
  cache_size: "512MB"
  log_max_size: "50MB"
```

Without `human_to_bytes`, you would have to either define everything in raw bytes (which is hard to read) or calculate the conversions by hand. Neither is a good option.

## Practical Example: JVM Configuration

Java applications need memory limits in various formats. Here is how to define them readably and convert as needed:

```yaml
# Define JVM settings in human-readable format and convert for config
- name: Deploy JVM configuration
  ansible.builtin.template:
    src: templates/jvm.options.j2
    dest: /etc/myapp/jvm.options
  vars:
    jvm_settings:
      heap_min: "2GB"
      heap_max: "4GB"
      metaspace: "512MB"
      thread_stack: "1MB"
```

The template:

```jinja2
{# templates/jvm.options.j2 - JVM options with byte-converted values #}
# JVM Configuration - Managed by Ansible
# Human-readable values for reference:
#   Heap Min: {{ jvm_settings.heap_min }}
#   Heap Max: {{ jvm_settings.heap_max }}
#   Metaspace: {{ jvm_settings.metaspace }}

-Xms{{ (jvm_settings.heap_min | human_to_bytes / 1048576) | int }}m
-Xmx{{ (jvm_settings.heap_max | human_to_bytes / 1048576) | int }}m
-XX:MaxMetaspaceSize={{ (jvm_settings.metaspace | human_to_bytes / 1048576) | int }}m
-Xss{{ (jvm_settings.thread_stack | human_to_bytes / 1024) | int }}k
```

Output:
```
-Xms2048m
-Xmx4096m
-XX:MaxMetaspaceSize=512m
-Xss1024k
```

## Nginx Configuration

Nginx uses different size units for different directives:

```yaml
# Generate nginx config with proper size values
- name: Configure nginx
  ansible.builtin.template:
    src: templates/nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  vars:
    nginx_settings:
      client_max_body_size: "100MB"
      proxy_buffer_size: "8KB"
      proxy_buffers_size: "32KB"
      large_client_header_buffers_size: "16KB"
```

```jinja2
{# templates/nginx.conf.j2 - Nginx config with converted sizes #}
http {
    # Size settings
    client_max_body_size {{ (nginx_settings.client_max_body_size | human_to_bytes / 1048576) | int }}m;
    proxy_buffer_size {{ (nginx_settings.proxy_buffer_size | human_to_bytes / 1024) | int }}k;
    proxy_buffers 4 {{ (nginx_settings.proxy_buffers_size | human_to_bytes / 1024) | int }}k;
    large_client_header_buffers 4 {{ (nginx_settings.large_client_header_buffers_size | human_to_bytes / 1024) | int }}k;
}
```

## Docker Container Memory Limits

Docker accepts memory limits in bytes when configured through Ansible modules:

```yaml
# Set Docker container memory limits using human-readable values
- name: Run containers with memory limits
  community.docker.docker_container:
    name: "{{ item.name }}"
    image: "{{ item.image }}"
    memory: "{{ item.memory_limit | human_to_bytes }}"
    memory_swap: "{{ item.swap_limit | human_to_bytes }}"
  loop:
    - name: web
      image: nginx:latest
      memory_limit: "256MB"
      swap_limit: "512MB"
    - name: api
      image: myapp:latest
      memory_limit: "1GB"
      swap_limit: "2GB"
    - name: worker
      image: myworker:latest
      memory_limit: "2GB"
      swap_limit: "4GB"
```

## Resource Validation

Use human_to_bytes to validate that resources meet minimum requirements:

```yaml
# Validate that configured values meet minimum thresholds
- name: Validate resource configuration
  ansible.builtin.assert:
    that:
      - (app_memory | human_to_bytes) >= (min_memory | human_to_bytes)
      - (app_disk | human_to_bytes) >= (min_disk | human_to_bytes)
      - (cache_size | human_to_bytes) >= (min_cache | human_to_bytes)
    fail_msg: >
      Resource validation failed!
      Memory: {{ app_memory }} (min: {{ min_memory }})
      Disk: {{ app_disk }} (min: {{ min_disk }})
      Cache: {{ cache_size }} (min: {{ min_cache }})
    success_msg: "All resource requirements met"
  vars:
    app_memory: "4GB"
    app_disk: "100GB"
    cache_size: "512MB"
    min_memory: "2GB"
    min_disk: "50GB"
    min_cache: "256MB"
```

## Comparing Against System Facts

Check if the system has enough resources for your application:

```yaml
# Verify system meets application requirements
- name: Check system memory
  ansible.builtin.fail:
    msg: >
      Insufficient memory. Required: {{ required_memory }}.
      Available: {{ ansible_memtotal_mb }}MB.
  when: (ansible_memtotal_mb * 1048576) < (required_memory | human_to_bytes)
  vars:
    required_memory: "8GB"

- name: Check disk space on /var
  ansible.builtin.fail:
    msg: >
      Insufficient disk space on /var. Required: {{ required_disk }}.
      Available: {{ var_mount.size_available | human_readable }}.
  when: var_mount.size_available < (required_disk | human_to_bytes)
  vars:
    required_disk: "50GB"
    var_mount: "{{ ansible_mounts | selectattr('mount', 'equalto', '/var') | first }}"
```

## PostgreSQL Configuration

PostgreSQL uses various memory settings that need to be in specific units:

```yaml
# Generate PostgreSQL config with proper memory values
- name: Configure PostgreSQL
  ansible.builtin.template:
    src: templates/postgresql.conf.j2
    dest: /etc/postgresql/14/main/postgresql.conf
  vars:
    pg_settings:
      shared_buffers: "4GB"
      work_mem: "256MB"
      maintenance_work_mem: "1GB"
      effective_cache_size: "12GB"
      wal_buffers: "64MB"
      temp_buffers: "128MB"
```

```jinja2
{# templates/postgresql.conf.j2 - PostgreSQL config with converted memory values #}
# PostgreSQL Configuration - Managed by Ansible

# Memory settings
{% for setting, value in pg_settings.items() | sort %}
{% set bytes = value | human_to_bytes %}
{% if bytes >= 1073741824 %}
{{ setting }} = {{ (bytes / 1073741824) | int }}GB
{% elif bytes >= 1048576 %}
{{ setting }} = {{ (bytes / 1048576) | int }}MB
{% else %}
{{ setting }} = {{ (bytes / 1024) | int }}kB
{% endif %}
{% endfor %}
```

## Supported Input Formats

The filter accepts various input formats:

```yaml
# Various input format examples
- name: Show supported formats
  ansible.builtin.debug:
    msg: |
      "1KB":   {{ "1KB" | human_to_bytes }}
      "1 KB":  {{ "1 KB" | human_to_bytes }}
      "1 K":   {{ "1 K" | human_to_bytes }}
      "1024B": {{ "1024B" | human_to_bytes }}
      "1M":    {{ "1M" | human_to_bytes }}
      "1.5G":  {{ "1.5G" | human_to_bytes }}
```

The filter handles both with and without spaces, and accepts both short (K, M, G) and long (KB, MB, GB) suffixes.

## Using with isbits Parameter

For network bandwidth values measured in bits:

```yaml
# Convert bit-based bandwidth values
- name: Convert bandwidth values
  ansible.builtin.debug:
    msg: |
      1 Mb (megabits): {{ "1Mb" | human_to_bytes(isbits=true) }} bits
      100 Mb: {{ "100Mb" | human_to_bytes(isbits=true) }} bits
      1 Gb: {{ "1Gb" | human_to_bytes(isbits=true) }} bits
```

## Round-Trip Conversion

You can convert back and forth:

```yaml
# Demonstrate round-trip conversion
- name: Round trip
  ansible.builtin.debug:
    msg: |
      Original: 2GB
      To bytes: {{ "2GB" | human_to_bytes }}
      Back to human: {{ ("2GB" | human_to_bytes) | human_readable }}
```

## Arithmetic with human_to_bytes

Because the filter returns a number, you can do math with it:

```yaml
# Calculate total memory allocation across services
- name: Calculate total memory needed
  ansible.builtin.debug:
    msg: |
      Web: {{ web_mem }}
      API: {{ api_mem }}
      DB: {{ db_mem }}
      Total: {{ total_bytes | human_readable }}
      System has: {{ (ansible_memtotal_mb * 1048576) | human_readable }}
      Sufficient: {{ 'Yes' if (ansible_memtotal_mb * 1048576) > total_bytes else 'No' }}
  vars:
    web_mem: "2GB"
    api_mem: "1GB"
    db_mem: "4GB"
    total_bytes: "{{ (web_mem | human_to_bytes) + (api_mem | human_to_bytes) + (db_mem | human_to_bytes) }}"
```

## Summary

The `human_to_bytes` filter lets you write configuration values in a format that humans can read while converting them to the raw numbers that applications and system configs require. Use it for JVM settings, Docker memory limits, database configs, web server tuning, and resource validation. It pairs naturally with `human_readable` for the reverse conversion. The ability to do arithmetic with the converted values makes it especially useful for calculating totals, checking thresholds, and comparing against system facts.
