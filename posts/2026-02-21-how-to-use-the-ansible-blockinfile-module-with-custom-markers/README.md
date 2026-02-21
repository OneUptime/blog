# How to Use the Ansible blockinfile Module with Custom Markers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, File Editing, DevOps

Description: Learn how to use custom markers with the Ansible blockinfile module to manage multiple independent text blocks within the same configuration file.

---

The default markers that `blockinfile` uses (`# BEGIN ANSIBLE MANAGED BLOCK` and `# END ANSIBLE MANAGED BLOCK`) work fine when you have one block per file. But when you need multiple blocks in the same file, or when the default comment style does not match the file format, custom markers become essential.

This post covers how to define custom markers, manage multiple blocks in one file, adapt markers for different file formats, and avoid the common mistakes that cause blocks to get duplicated or lost.

## The Default Marker Problem

By default, `blockinfile` uses these markers:

```
# BEGIN ANSIBLE MANAGED BLOCK
(your content here)
# END ANSIBLE MANAGED BLOCK
```

If you add two blocks to the same file with default markers, the second task overwrites the first because they both use the same marker:

```yaml
# BAD - the second task overwrites the first because markers are identical
- name: Add database config (gets overwritten!)
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    block: |
      db_host=localhost
      db_port=5432

- name: Add cache config (overwrites the database block!)
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    block: |
      cache_host=localhost
      cache_port=6379
```

The solution is custom markers.

## Custom Marker Syntax

The `marker` parameter accepts a string that must contain `{mark}`. Ansible replaces `{mark}` with `BEGIN` and `END` to create the opening and closing markers:

```yaml
# CORRECT - unique markers for each block
- name: Add database config
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    marker: "# {mark} DATABASE CONFIG"
    block: |
      db_host=localhost
      db_port=5432

- name: Add cache config
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    marker: "# {mark} CACHE CONFIG"
    block: |
      cache_host=localhost
      cache_port=6379
```

The resulting file looks like:

```
# BEGIN DATABASE CONFIG
db_host=localhost
db_port=5432
# END DATABASE CONFIG
# BEGIN CACHE CONFIG
cache_host=localhost
cache_port=6379
# END CACHE CONFIG
```

Each block is independently managed. You can update the database config without touching the cache config, and vice versa.

## Markers for Different File Formats

Not all configuration files use `#` for comments. Custom markers let you match the file's native comment syntax:

### XML Files

```yaml
# Use XML comment syntax for markers
- name: Add custom properties to XML config
  ansible.builtin.blockinfile:
    path: /etc/myapp/config.xml
    marker: "<!-- {mark} CUSTOM PROPERTIES -->"
    insertbefore: "</configuration>"
    block: |
      <property name="max.connections" value="500"/>
      <property name="timeout" value="30"/>
      <property name="log.level" value="INFO"/>
```

### CSS Files

```yaml
# Use CSS comment syntax for markers
- name: Add custom CSS styles
  ansible.builtin.blockinfile:
    path: /var/www/myapp/custom.css
    marker: "/* {mark} CUSTOM STYLES */"
    block: |
      .maintenance-banner {
        background-color: #ff9800;
        color: white;
        text-align: center;
        padding: 10px;
      }
```

### SQL Files

```yaml
# Use SQL comment syntax for markers
- name: Add custom SQL grants
  ansible.builtin.blockinfile:
    path: /opt/db/init.sql
    marker: "-- {mark} APP USER GRANTS"
    block: |
      GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.* TO 'appuser'@'%';
      GRANT EXECUTE ON myapp_db.* TO 'appuser'@'%';
      FLUSH PRIVILEGES;
```

### Windows INI Files

```yaml
# Use semicolon comments for INI files
- name: Add custom settings to INI file
  ansible.builtin.blockinfile:
    path: /etc/myapp/settings.ini
    marker: "; {mark} PERFORMANCE SETTINGS"
    insertafter: "^\\[performance\\]"
    block: |
      max_threads = 8
      queue_size = 1000
      buffer_size = 64k
```

### Batch/CMD Files

```yaml
# Use REM for Windows batch file markers
- name: Add environment variables to batch file
  ansible.builtin.blockinfile:
    path: /opt/myapp/run.bat
    marker: "REM {mark} ENVIRONMENT SETUP"
    block: |
      SET JAVA_HOME=C:\Program Files\Java\jdk-17
      SET APP_HOME=C:\myapp
      SET PATH=%JAVA_HOME%\bin;%APP_HOME%\bin;%PATH%
```

## Customizing the BEGIN and END Words

You can also change what `BEGIN` and `END` say by using `mark_begin` and `mark_end`:

```yaml
# Use custom begin/end text
- name: Add monitoring rules
  ansible.builtin.blockinfile:
    path: /etc/prometheus/rules.yml
    marker: "# {mark} ALERTING RULES"
    mark_begin: "START"
    mark_end: "STOP"
    block: |
      - alert: HighCPU
        expr: cpu_usage > 90
        for: 5m
```

This produces:

```
# START ALERTING RULES
- alert: HighCPU
  expr: cpu_usage > 90
  for: 5m
# STOP ALERTING RULES
```

## Managing Multiple Blocks with a Loop

When you have many blocks to manage, use a loop with a dictionary:

```yaml
# Add multiple configuration sections using a loop
- name: Add configuration blocks
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    marker: "# {mark} {{ item.name | upper }}"
    block: "{{ item.content }}"
  loop:
    - name: "database"
      content: |
        db_host=localhost
        db_port=5432
        db_name=myapp
        db_pool_size=20
    - name: "cache"
      content: |
        cache_backend=redis
        cache_host=localhost
        cache_port=6379
        cache_ttl=3600
    - name: "email"
      content: |
        smtp_host=mail.internal
        smtp_port=587
        smtp_tls=true
    - name: "logging"
      content: |
        log_level=info
        log_file=/var/log/myapp/app.log
        log_max_size=100M
        log_rotate_count=10
  loop_control:
    label: "{{ item.name }}"
```

## Dynamic Block Content from Variables

Generate block content from structured data:

```yaml
# Generate HAProxy backend servers from inventory
- name: Configure HAProxy backend
  ansible.builtin.blockinfile:
    path: /etc/haproxy/haproxy.cfg
    marker: "# {mark} BACKEND SERVERS"
    insertafter: "^backend web_servers"
    block: |
      {% for host in groups['web_servers'] %}
      server {{ hostvars[host]['inventory_hostname_short'] }} {{ hostvars[host]['ansible_host'] }}:8080 check inter 5s fall 3 rise 2
      {% endfor %}
  notify: Reload HAProxy
```

```yaml
# Generate authorized_keys from a list of team members
- name: Add team SSH keys
  ansible.builtin.blockinfile:
    path: /home/deploy/.ssh/authorized_keys
    marker: "# {mark} {{ item.team | upper }} TEAM KEYS"
    block: |
      {% for key in item.keys %}
      {{ key }}
      {% endfor %}
  loop:
    - team: devops
      keys:
        - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBxx... alice@devops"
        - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICyy... bob@devops"
    - team: developers
      keys:
        - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDzz... carol@dev"
        - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEaa... dave@dev"
  loop_control:
    label: "{{ item.team }}"
```

## Removing Specific Blocks

With custom markers, you can remove specific blocks without affecting others:

```yaml
# Remove only the cache configuration block
- name: Remove cache configuration
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    marker: "# {mark} CACHE CONFIG"
    state: absent
```

This removes only the cache block. The database block and any other blocks remain.

## Marker Best Practices

### Use Descriptive Names

```yaml
# GOOD - descriptive markers that explain the purpose
marker: "# {mark} PROMETHEUS ALERTING RULES"
marker: "# {mark} NGINX PROXY HEADERS"
marker: "# {mark} POSTGRESQL CLIENT AUTH"

# BAD - vague markers that will confuse future readers
marker: "# {mark} BLOCK 1"
marker: "# {mark} STUFF"
marker: "# {mark} CONFIG"
```

### Use Consistent Naming Conventions

```yaml
# Pick a convention and stick with it across your project
# Convention: COMPONENT - PURPOSE
marker: "# {mark} MYAPP - DATABASE SETTINGS"
marker: "# {mark} MYAPP - CACHE SETTINGS"
marker: "# {mark} MYAPP - LOGGING SETTINGS"
marker: "# {mark} NGINX - SECURITY HEADERS"
marker: "# {mark} NGINX - PROXY SETTINGS"
```

### Keep Markers Machine-Parseable

```yaml
# Include a namespace to avoid collisions with other tools
marker: "# {mark} ANSIBLE:MYAPP:DATABASE"
```

## Complete Example: Multi-Section Application Configuration

```yaml
# configure-full-app.yml - manage all config sections independently
---
- name: Configure application with multiple sections
  hosts: app_servers
  become: true
  vars:
    config_sections:
      - name: "SERVER"
        content: |
          bind_address = 0.0.0.0
          port = {{ app_port }}
          workers = {{ ansible_processor_vcpus }}
          max_requests = 10000

      - name: "DATABASE"
        content: |
          db_host = {{ db_host }}
          db_port = {{ db_port }}
          db_name = {{ db_name }}
          db_pool_size = {{ db_pool_size | default(20) }}
          db_timeout = 30

      - name: "CACHE"
        content: |
          cache_backend = redis
          cache_url = redis://{{ redis_host }}:{{ redis_port }}/0
          cache_ttl = {{ cache_ttl | default(3600) }}

      - name: "SECURITY"
        content: |
          secret_key_file = /etc/myapp/secret.key
          session_timeout = 3600
          csrf_enabled = true
          cors_origins = {{ cors_origins | default('*') }}

      - name: "LOGGING"
        content: |
          log_level = {{ log_level | default('info') }}
          log_file = /var/log/myapp/app.log
          log_format = json
          access_log = /var/log/myapp/access.log

  tasks:
    - name: Ensure config file exists
      ansible.builtin.file:
        path: /etc/myapp/app.conf
        state: touch
        owner: root
        group: myapp
        mode: "0640"
        modification_time: preserve
        access_time: preserve

    - name: Manage configuration sections
      ansible.builtin.blockinfile:
        path: /etc/myapp/app.conf
        marker: "# {mark} {{ item.name }}"
        block: "{{ item.content }}"
      loop: "{{ config_sections }}"
      loop_control:
        label: "{{ item.name }}"
      notify: Restart myapp

  handlers:
    - name: Restart myapp
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

## Summary

Custom markers are what make `blockinfile` a practical tool for real-world configuration management. Use unique, descriptive markers to manage multiple independent blocks in the same file, adapt the marker syntax to match the file format (XML, CSS, SQL, etc.), generate block content dynamically from variables and inventory data, and follow a consistent naming convention across your project. The combination of custom markers with loops and Jinja2 templates gives you a flexible way to manage complex configuration files without resorting to full template management.
