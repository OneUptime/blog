# How to Use include_vars to Load Variables from Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Configuration Management, Automation

Description: A complete guide to using the include_vars module in Ansible to dynamically load variables from YAML and JSON files during playbook execution.

---

As Ansible playbooks grow, hardcoding variables directly in plays becomes messy. The `include_vars` module lets you load variables from external YAML or JSON files during playbook execution. This keeps your playbooks clean, makes variable management scalable, and enables patterns like environment-specific or OS-specific variable loading.

## Basic include_vars Usage

At its simplest, `include_vars` reads a YAML or JSON file and makes its contents available as variables for the rest of the play.

```yaml
# basic-include-vars.yml
# Loads variables from an external YAML file
---
- name: Load variables from file
  hosts: all
  tasks:
    - name: Include variables from a YAML file
      ansible.builtin.include_vars:
        file: vars/app-config.yml

    - name: Use the loaded variables
      ansible.builtin.debug:
        msg:
          - "App name: {{ app_name }}"
          - "App version: {{ app_version }}"
          - "Database host: {{ db_host }}"
```

And the variables file:

```yaml
# vars/app-config.yml
# Application configuration variables
app_name: mywebapp
app_version: "2.4.1"
db_host: db.internal.example.com
db_port: 5432
db_name: production
log_level: info
max_connections: 100
```

## Loading Variables into a Namespace

By default, all variables from the file become top-level variables. If you are loading multiple files, names might collide. Use the `name` parameter to put them under a namespace.

```yaml
# namespaced-vars.yml
# Loads variables into named dictionaries to avoid collisions
---
- name: Load multiple variable files with namespaces
  hosts: all
  tasks:
    - name: Load database config
      ansible.builtin.include_vars:
        file: vars/database.yml
        name: db_config

    - name: Load cache config
      ansible.builtin.include_vars:
        file: vars/cache.yml
        name: cache_config

    - name: Use namespaced variables
      ansible.builtin.debug:
        msg:
          - "DB host: {{ db_config.host }}"
          - "DB port: {{ db_config.port }}"
          - "Cache host: {{ cache_config.host }}"
          - "Cache port: {{ cache_config.port }}"
```

```yaml
# vars/database.yml
host: db.internal.example.com
port: 5432
name: production

# vars/cache.yml
host: redis.internal.example.com
port: 6379
max_memory: 512mb
```

With namespaces, even though both files have a `host` key, they do not conflict.

## Loading Variables from a Directory

The `dir` parameter loads all variable files from a directory. This is great for organizing variables by category.

```yaml
# load-from-directory.yml
# Loads all YAML files from a directory
---
- name: Load all variable files from a directory
  hosts: all
  tasks:
    - name: Load all vars from the config directory
      ansible.builtin.include_vars:
        dir: vars/config/
        extensions:
          - yml
          - yaml

    - name: Show loaded variables
      ansible.builtin.debug:
        msg:
          - "App port: {{ app_port }}"
          - "Log path: {{ log_path }}"
          - "Workers: {{ worker_count }}"
```

The directory structure:

```
vars/config/
  app.yml
  logging.yml
  workers.yml
```

All files in the directory are loaded alphabetically. If two files define the same variable, the file that loads last wins.

## OS-Specific Variable Loading

One of the most powerful patterns with `include_vars` is loading different variable files based on the operating system. This keeps your main playbook clean while supporting multiple platforms.

```yaml
# os-specific-vars.yml
# Loads variables specific to the target OS
---
- name: Load OS-specific variables
  hosts: all
  gather_facts: yes
  tasks:
    - name: Load OS-specific variables
      ansible.builtin.include_vars:
        file: "vars/{{ ansible_facts['os_family'] | lower }}.yml"

    - name: Install packages using OS-specific variable
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      loop: "{{ packages }}"
      become: yes
```

```yaml
# vars/debian.yml
# Variables specific to Debian/Ubuntu systems
packages:
  - nginx
  - python3-pip
  - build-essential
service_name: nginx
config_path: /etc/nginx/sites-available/default

# vars/redhat.yml
# Variables specific to RHEL/CentOS systems
packages:
  - nginx
  - python3-pip
  - gcc
  - make
service_name: nginx
config_path: /etc/nginx/conf.d/default.conf
```

## Fallback Variable Loading

When you have distribution-specific files but want a fallback for unsupported distributions, use `first_found` with `include_vars`.

```yaml
# fallback-vars.yml
# Tries distribution-specific vars first, falls back to OS family
---
- name: Load variables with fallback
  hosts: all
  gather_facts: yes
  tasks:
    - name: Load most specific vars available
      ansible.builtin.include_vars:
        file: "{{ item }}"
      with_first_found:
        - "vars/{{ ansible_facts['distribution'] | lower }}-{{ ansible_facts['distribution_major_version'] }}.yml"
        - "vars/{{ ansible_facts['distribution'] | lower }}.yml"
        - "vars/{{ ansible_facts['os_family'] | lower }}.yml"
        - "vars/default.yml"

    - name: Show which vars were loaded
      ansible.builtin.debug:
        msg: "Using package list: {{ packages | join(', ') }}"
```

This tries to load, in order:
1. `vars/ubuntu-22.yml` (exact distribution and version)
2. `vars/ubuntu.yml` (distribution only)
3. `vars/debian.yml` (OS family)
4. `vars/default.yml` (universal fallback)

## Environment-Specific Variables

Load different variables based on the deployment environment.

```yaml
# environment-vars.yml
# Loads variables for the target deployment environment
---
- name: Deploy with environment-specific config
  hosts: all
  vars:
    env: "{{ deploy_env | default('development') }}"
  tasks:
    - name: Load environment variables
      ansible.builtin.include_vars:
        file: "vars/environments/{{ env }}.yml"

    - name: Show environment config
      ansible.builtin.debug:
        msg:
          - "Environment: {{ env }}"
          - "Debug mode: {{ debug_mode }}"
          - "Log level: {{ log_level }}"
          - "Replicas: {{ replicas }}"
```

```yaml
# vars/environments/development.yml
debug_mode: true
log_level: debug
replicas: 1
db_host: localhost
cache_enabled: false

# vars/environments/production.yml
debug_mode: false
log_level: warn
replicas: 3
db_host: db-cluster.internal
cache_enabled: true
```

Run with different environments:

```bash
# Deploy to development
ansible-playbook environment-vars.yml -e deploy_env=development

# Deploy to production
ansible-playbook environment-vars.yml -e deploy_env=production
```

## Conditional include_vars

Load variables only when certain conditions are met.

```yaml
# conditional-include.yml
# Conditionally loads variable files based on host attributes
---
- name: Conditional variable loading
  hosts: all
  gather_facts: yes
  tasks:
    - name: Load high-memory config for large servers
      ansible.builtin.include_vars:
        file: vars/high-memory.yml
      when: ansible_facts['memtotal_mb'] > 16384

    - name: Load low-memory config for small servers
      ansible.builtin.include_vars:
        file: vars/low-memory.yml
      when: ansible_facts['memtotal_mb'] <= 16384

    - name: Apply configuration
      ansible.builtin.debug:
        msg: "Worker count: {{ worker_count }}, Buffer size: {{ buffer_size_mb }}MB"
```

## Loading JSON Variables

`include_vars` works with JSON files too, which is useful when variables are generated by external tools.

```yaml
# load-json-vars.yml
# Loads variables from a JSON file
---
- name: Load JSON variables
  hosts: all
  tasks:
    - name: Load config from JSON
      ansible.builtin.include_vars:
        file: vars/config.json

    - name: Use JSON-loaded variables
      ansible.builtin.debug:
        msg: "Server: {{ server_name }}, Port: {{ server_port }}"
```

```json
{
  "server_name": "myapp.example.com",
  "server_port": 8443,
  "ssl_enabled": true,
  "allowed_origins": [
    "https://app.example.com",
    "https://admin.example.com"
  ]
}
```

## Using include_vars with Loops

Load variables from multiple files in a loop.

```yaml
# loop-include-vars.yml
# Loads variables from multiple files in sequence
---
- name: Load multiple variable files
  hosts: all
  tasks:
    - name: Load all component configs
      ansible.builtin.include_vars:
        file: "vars/components/{{ item }}.yml"
        name: "{{ item }}_config"
      loop:
        - frontend
        - backend
        - database
        - cache

    - name: Display loaded configs
      ansible.builtin.debug:
        msg:
          - "Frontend port: {{ frontend_config.port }}"
          - "Backend port: {{ backend_config.port }}"
          - "DB host: {{ database_config.host }}"
```

## Using dir with files_matching

When loading from a directory, you can filter files by pattern.

```yaml
# filtered-dir-vars.yml
# Loads only matching files from a directory
---
- name: Load filtered variable files
  hosts: all
  tasks:
    - name: Load only production variable files
      ansible.builtin.include_vars:
        dir: vars/all/
        files_matching: ".*prod.*\\.yml$"
        extensions:
          - yml

    - name: Load only security-related variables
      ansible.builtin.include_vars:
        dir: vars/all/
        files_matching: ".*security.*\\.yml$"
        extensions:
          - yml
        name: security_vars
```

## Summary

The `include_vars` module is a key tool for managing variables at scale. Use `file` for loading individual files, `dir` for loading entire directories, `name` for namespacing to prevent collisions, and `with_first_found` for fallback chains. The most powerful pattern is OS-specific and environment-specific variable loading, which keeps your main playbooks clean and generic while supporting diverse environments. Combined with conditionals and facts, `include_vars` enables truly adaptive configuration management.
