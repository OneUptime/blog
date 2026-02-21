# How to Override Role Default Variables in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Variables, Configuration Management

Description: Learn the different ways to override Ansible role default variables including play vars, inventory vars, extra vars, and role parameters.

---

Ansible roles are designed to be reusable. A well-written role uses default variables for all configurable values, letting consumers of the role customize behavior without modifying the role itself. Knowing how and where to override these defaults is a fundamental skill for anyone working with Ansible roles.

## How Role Defaults Work

Role defaults live in `roles/<role_name>/defaults/main.yml`. They have the lowest priority in Ansible's variable precedence, which means almost any other variable source can override them. This is by design.

```yaml
# roles/nginx/defaults/main.yml
# Default values - users are expected to override these
nginx_port: 80
nginx_worker_processes: auto
nginx_worker_connections: 1024
nginx_keepalive_timeout: 65
nginx_server_name: localhost
nginx_root: /var/www/html
nginx_log_format: combined
nginx_access_log: /var/log/nginx/access.log
nginx_error_log: /var/log/nginx/error.log
nginx_ssl_enabled: false
nginx_ssl_cert: ""
nginx_ssl_key: ""
```

```yaml
# roles/nginx/tasks/main.yml
# Role tasks use the default variables
---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present

- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: reload nginx

- name: Deploy server block
  ansible.builtin.template:
    src: server.conf.j2
    dest: /etc/nginx/conf.d/default.conf
    mode: '0644'
  notify: reload nginx
```

## Method 1: Override with Play vars

The most common way to override role defaults is in the play's `vars` section.

```yaml
# override-with-vars.yml
# Overrides role defaults using play-level vars
---
- name: Deploy nginx with custom settings
  hosts: webservers
  become: yes
  vars:
    nginx_port: 8080
    nginx_worker_processes: 4
    nginx_worker_connections: 2048
    nginx_server_name: myapp.example.com
    nginx_root: /opt/myapp/public
  roles:
    - nginx
```

Play `vars` have higher priority than role defaults, so these values take effect while the unspecified defaults remain unchanged.

## Method 2: Override with Role Parameters

When including roles in the `roles` list, you can pass variables directly as role parameters.

```yaml
# override-with-params.yml
# Overrides defaults using inline role parameters
---
- name: Deploy nginx with role parameters
  hosts: webservers
  become: yes
  roles:
    - role: nginx
      vars:
        nginx_port: 8080
        nginx_ssl_enabled: true
        nginx_ssl_cert: /etc/ssl/certs/myapp.crt
        nginx_ssl_key: /etc/ssl/private/myapp.key
```

Role parameters passed through `vars` under the role entry have the same precedence as play `vars`. This approach is cleaner when you have multiple roles and want to keep each role's overrides visually associated with the role.

## Method 3: Override with include_role

When using `include_role` or `import_role` as tasks, pass overrides through the `vars` keyword.

```yaml
# override-with-include.yml
# Overrides defaults when using include_role
---
- name: Deploy with include_role overrides
  hosts: webservers
  become: yes
  tasks:
    - name: Deploy nginx with custom settings
      ansible.builtin.include_role:
        name: nginx
      vars:
        nginx_port: 8443
        nginx_ssl_enabled: true

    - name: Deploy another instance with different settings
      ansible.builtin.include_role:
        name: nginx
      vars:
        nginx_port: 9090
        nginx_server_name: api.example.com
        nginx_root: /opt/api/public
```

The advantage of `include_role` is that you can call the same role multiple times with different override values. Each invocation gets its own set of overrides.

## Method 4: Override with Inventory Variables

Group variables and host variables override role defaults. This is useful for environment-specific configuration.

```ini
# inventory/hosts.ini
[webservers]
web-01 ansible_host=192.168.1.10
web-02 ansible_host=192.168.1.11

[webservers:vars]
nginx_worker_processes=8
nginx_worker_connections=4096
```

```yaml
# inventory/group_vars/webservers.yml
# Group variables for webservers override role defaults
nginx_port: 8080
nginx_keepalive_timeout: 120
nginx_server_name: www.example.com
```

```yaml
# inventory/host_vars/web-01.yml
# Host-specific overrides for web-01
nginx_server_name: web-01.example.com
nginx_ssl_enabled: true
nginx_ssl_cert: /etc/ssl/certs/web-01.crt
nginx_ssl_key: /etc/ssl/private/web-01.key
```

```yaml
# site.yml
# The playbook itself is clean - overrides come from inventory
---
- name: Deploy nginx
  hosts: webservers
  become: yes
  roles:
    - nginx
```

With this setup, all web servers get `nginx_port: 8080` from group vars, but `web-01` gets its own SSL configuration from host vars.

## Method 5: Override with vars_files

Load overrides from external files.

```yaml
# override-with-vars-files.yml
# Overrides from external files
---
- name: Deploy nginx with file-based overrides
  hosts: webservers
  become: yes
  vars_files:
    - vars/nginx-production.yml
  roles:
    - nginx
```

```yaml
# vars/nginx-production.yml
# Production nginx settings
nginx_port: 443
nginx_ssl_enabled: true
nginx_worker_processes: 16
nginx_worker_connections: 4096
nginx_keepalive_timeout: 120
nginx_server_name: prod.example.com
nginx_log_format: json
```

## Method 6: Override with Extra Vars

Extra vars (`-e`) have the highest priority and override everything, including role `vars` (not just defaults).

```bash
# Override via command line - highest priority
ansible-playbook site.yml -e "nginx_port=9090 nginx_worker_processes=2"

# Override from a file
ansible-playbook site.yml -e @overrides.yml
```

Use extra vars for temporary overrides, debugging, or CI/CD pipeline parameters. They should not be your primary override mechanism because they are not version-controlled with the playbook.

## Overriding Multiple Roles

When applying multiple roles, keep overrides organized by role.

```yaml
# multi-role-overrides.yml
# Clean override pattern for multiple roles
---
- name: Deploy full application stack
  hosts: appservers
  become: yes
  roles:
    - role: base_system
      vars:
        base_timezone: "America/New_York"
        base_ntp_servers:
          - ntp1.internal
          - ntp2.internal

    - role: nginx
      vars:
        nginx_port: 8080
        nginx_ssl_enabled: true
        nginx_server_name: app.example.com

    - role: postgresql
      vars:
        postgresql_version: 15
        postgresql_max_connections: 200
        postgresql_shared_buffers: 2GB

    - role: myapp
      vars:
        myapp_version: "2.4.1"
        myapp_workers: 8
        myapp_db_host: localhost
```

## Role vars vs Role defaults

Understanding the difference between `roles/x/vars/main.yml` and `roles/x/defaults/main.yml` is crucial.

```yaml
# roles/myapp/defaults/main.yml
# LOW priority - meant to be overridden by users
myapp_port: 8080
myapp_workers: 4
myapp_log_level: info
myapp_cache_enabled: true

# roles/myapp/vars/main.yml
# HIGH priority - internal role configuration, not meant for user override
myapp_internal_config_dir: /etc/myapp
myapp_internal_lib_dir: /usr/lib/myapp
myapp_internal_supported_platforms:
  - Debian
  - RedHat
```

Role `vars` have higher priority than play `vars`, `vars_files`, and most other sources. Only extra vars and `set_fact` can override them. If a role author puts a variable in `vars/main.yml` instead of `defaults/main.yml`, it is intentionally hard to override.

```yaml
# This override WILL work for defaults
# This override will NOT work for role vars
- name: Override attempt
  hosts: all
  vars:
    myapp_port: 9090              # Works - overrides default
    myapp_internal_config_dir: /custom  # Does NOT work - role vars win
  roles:
    - myapp
```

To override role `vars`, you need extra vars:

```bash
# Only extra vars can override role vars
ansible-playbook site.yml -e "myapp_internal_config_dir=/custom"
```

## Conditional Overrides Based on Environment

A pattern for environment-specific role overrides.

```yaml
# environment-overrides.yml
# Loads role overrides based on target environment
---
- name: Deploy with environment-specific role settings
  hosts: appservers
  become: yes
  vars:
    env: "{{ deploy_env | default('development') }}"
  pre_tasks:
    - name: Load environment-specific role overrides
      ansible.builtin.include_vars:
        file: "vars/{{ env }}/nginx.yml"
  roles:
    - nginx
    - myapp
```

```yaml
# vars/development/nginx.yml
nginx_port: 8080
nginx_worker_processes: 2
nginx_ssl_enabled: false
nginx_log_format: combined

# vars/production/nginx.yml
nginx_port: 443
nginx_worker_processes: auto
nginx_ssl_enabled: true
nginx_log_format: json
```

## Documenting Override Points

Good roles document which defaults are meant to be overridden.

```yaml
# roles/myapp/defaults/main.yml
# ============================================
# MyApp Role - Configurable Variables
# ============================================
# Override these variables to customize the role.
# See README.md for full documentation.

# --- Application Settings ---
# The version of the application to install
myapp_version: "latest"

# Port the application listens on
myapp_port: 8080

# Number of worker processes (set to 0 for auto)
myapp_workers: 0

# --- Database Settings ---
# Database connection parameters
myapp_db_host: localhost
myapp_db_port: 5432
myapp_db_name: myapp
myapp_db_user: myapp

# --- Logging ---
# Log level: debug, info, warn, error
myapp_log_level: info

# Log output: file, stdout, syslog
myapp_log_output: file
```

## Summary

Ansible provides multiple ways to override role defaults, each with different precedence levels. From lowest to highest priority: role defaults, inventory group vars, inventory host vars, play vars, vars_files, role parameters, include_vars, set_fact, and extra vars. Use play vars or role parameters for standard customization, inventory variables for environment-specific settings, and extra vars for one-off overrides. Understanding the difference between role `defaults` (meant to be overridden) and role `vars` (internal configuration) helps you work with roles as their authors intended.
