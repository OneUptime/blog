# How to Define Role Default Variables in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Variables, Configuration Management

Description: Learn how to define and use role default variables in Ansible to create flexible, reusable roles with sensible fallback values.

---

When you build an Ansible role, you want it to work out of the box with zero configuration while still allowing consumers to tweak every knob. That is exactly what role default variables are for. They sit at the bottom of Ansible's variable precedence hierarchy, which means anything else (inventory vars, playbook vars, extra vars) will override them. This post covers how to define defaults properly, organize them for readability, and avoid common pitfalls.

## Where Defaults Live

Role defaults live in `defaults/main.yml` inside your role directory:

```
roles/
  myapp/
    defaults/
      main.yml    <-- default variables go here
    tasks/
      main.yml
```

Ansible loads this file automatically when the role is applied. You do not need to include or import it.

## Basic Default Variable Definition

Here is a straightforward example for a role that deploys a web application:

```yaml
# roles/myapp/defaults/main.yml
# Sensible defaults - consumers can override any of these
---
myapp_version: "2.5.0"
myapp_port: 3000
myapp_bind_address: "0.0.0.0"
myapp_log_level: "info"
myapp_install_dir: "/opt/myapp"
myapp_user: "myapp"
myapp_group: "myapp"
myapp_env: "production"
```

These values are what get used if the role consumer does not set them explicitly. The tasks file references them like any other variable:

```yaml
# roles/myapp/tasks/main.yml
# Tasks that use the default variables (or overridden values)
---
- name: Create application user
  ansible.builtin.user:
    name: "{{ myapp_user }}"
    group: "{{ myapp_group }}"
    system: yes
    shell: /usr/sbin/nologin

- name: Create install directory
  ansible.builtin.file:
    path: "{{ myapp_install_dir }}"
    state: directory
    owner: "{{ myapp_user }}"
    group: "{{ myapp_group }}"
    mode: '0755'

- name: Download application binary
  ansible.builtin.get_url:
    url: "https://releases.example.com/myapp/{{ myapp_version }}/myapp-linux-amd64"
    dest: "{{ myapp_install_dir }}/myapp"
    owner: "{{ myapp_user }}"
    mode: '0755'
```

## Namespacing Your Variables

Always prefix role default variables with the role name. This prevents collisions when multiple roles are applied to the same host. If your role is called `myapp`, prefix everything with `myapp_`.

Bad practice:

```yaml
# Do not do this - "port" and "version" will collide with other roles
---
port: 3000
version: "2.5.0"
log_level: "info"
```

Good practice:

```yaml
# Namespaced - no risk of collision
---
myapp_port: 3000
myapp_version: "2.5.0"
myapp_log_level: "info"
```

## Complex Default Values

Defaults are not limited to simple strings and numbers. You can define lists, dictionaries, and nested structures:

```yaml
# roles/myapp/defaults/main.yml
# Complex data structures work fine as defaults
---
myapp_version: "2.5.0"
myapp_port: 3000

# List of features to enable
myapp_features:
  - api
  - websocket
  - metrics

# Database connection settings as a dictionary
myapp_database:
  host: "localhost"
  port: 5432
  name: "myapp_production"
  pool_size: 10

# List of environment variables to set
myapp_environment_vars:
  - key: NODE_ENV
    value: "production"
  - key: LOG_FORMAT
    value: "json"

# Firewall rules the role should configure
myapp_firewall_rules:
  - port: "{{ myapp_port }}"
    proto: tcp
    rule: allow
```

## Using Defaults in Templates

Defaults shine when combined with templates. You can build configuration files that work out of the box but are fully customizable:

```jinja2
{# roles/myapp/templates/config.toml.j2 #}
{# Application configuration rendered from role variables #}
[server]
port = {{ myapp_port }}
bind_address = "{{ myapp_bind_address }}"

[logging]
level = "{{ myapp_log_level }}"

[database]
host = "{{ myapp_database.host }}"
port = {{ myapp_database.port }}
name = "{{ myapp_database.name }}"
pool_size = {{ myapp_database.pool_size }}

[features]
{% for feature in myapp_features %}
{{ feature }} = true
{% endfor %}
```

## Overriding Defaults

The whole point of defaults is that they are easy to override. Here are the various ways a consumer can override them, listed from lowest to highest precedence:

### In the playbook roles section:

```yaml
# Override defaults when applying the role
---
- hosts: app_servers
  roles:
    - role: myapp
      vars:
        myapp_version: "3.0.0"
        myapp_port: 8080
```

### In group_vars:

```yaml
# group_vars/production.yml
# Override for all production hosts
myapp_log_level: "warn"
myapp_env: "production"
```

### In host_vars:

```yaml
# host_vars/app01.example.com.yml
# Override for a specific host
myapp_port: 9090
```

### Via extra vars on the command line:

```bash
# Extra vars have the highest precedence
ansible-playbook site.yml -e "myapp_version=3.1.0"
```

## Splitting Defaults Across Multiple Files

For roles with many defaults, a single `main.yml` can get long. You can split defaults into multiple files and include them:

```yaml
# roles/myapp/defaults/main.yml
# Load all default variable files
---
# Core defaults
myapp_version: "2.5.0"
myapp_port: 3000
myapp_user: "myapp"

# Pull in additional default files
# Note: you need to use include_vars in tasks for extra files,
# or keep everything in main.yml
```

Actually, Ansible only auto-loads `defaults/main.yml` (or `defaults/main/` as a directory of YAML files since Ansible 2.11+). If you want to split defaults, the cleanest approach since Ansible 2.11 is to use a directory:

```
roles/myapp/defaults/main/
  core.yml
  database.yml
  logging.yml
```

```yaml
# roles/myapp/defaults/main/core.yml
---
myapp_version: "2.5.0"
myapp_port: 3000
myapp_user: "myapp"
```

```yaml
# roles/myapp/defaults/main/database.yml
---
myapp_database:
  host: "localhost"
  port: 5432
  name: "myapp_production"
  pool_size: 10
```

```yaml
# roles/myapp/defaults/main/logging.yml
---
myapp_log_level: "info"
myapp_log_format: "json"
myapp_log_file: "/var/log/myapp/app.log"
```

Ansible merges all YAML files from the `defaults/main/` directory automatically.

## Boolean Defaults and Feature Flags

A powerful pattern is using boolean defaults as feature flags:

```yaml
# roles/myapp/defaults/main.yml
# Feature flags - enable/disable role behaviors
---
myapp_install_enabled: true
myapp_configure_firewall: true
myapp_setup_logrotate: true
myapp_enable_tls: false
myapp_create_database: false
myapp_install_monitoring_agent: false
```

Then guard tasks with conditionals:

```yaml
# roles/myapp/tasks/main.yml
# Conditionally execute sections based on feature flags
---
- name: Install application
  ansible.builtin.include_tasks: install.yml
  when: myapp_install_enabled

- name: Configure firewall rules
  ansible.builtin.include_tasks: firewall.yml
  when: myapp_configure_firewall

- name: Set up TLS certificates
  ansible.builtin.include_tasks: tls.yml
  when: myapp_enable_tls

- name: Configure log rotation
  ansible.builtin.include_tasks: logrotate.yml
  when: myapp_setup_logrotate
```

This lets consumers enable or disable specific behaviors without modifying the role itself.

## Documenting Your Defaults

Since `defaults/main.yml` is the primary interface to your role, document it thoroughly with comments:

```yaml
# roles/myapp/defaults/main.yml
---
# Application version to install. Check https://releases.example.com for available versions.
myapp_version: "2.5.0"

# TCP port the application listens on. Must be above 1024 if running as non-root.
myapp_port: 3000

# Log level. Valid values: debug, info, warn, error
myapp_log_level: "info"

# Maximum number of database connections in the pool.
# Increase this if you see "connection pool exhausted" errors.
myapp_database_pool_size: 10
```

## Wrapping Up

Role defaults are the foundation of reusable Ansible roles. By putting sensible values in `defaults/main.yml`, you ensure your role works without any configuration while remaining fully customizable. The rules are simple: namespace your variables, document them clearly, keep internal constants in `vars/` instead of `defaults/`, and use boolean flags to let consumers toggle features on and off. Follow these practices and your roles will be straightforward for anyone to use.
