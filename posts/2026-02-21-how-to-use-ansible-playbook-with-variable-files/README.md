# How to Use Ansible Playbook with Variable Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Configuration Management, DevOps

Description: Learn how to use external variable files in Ansible playbooks with vars_files, include_vars, and extra-vars for flexible configuration management.

---

Hard-coding values in playbooks makes them rigid and hard to reuse. Ansible's variable file system lets you externalize configuration into separate YAML files, making your playbooks portable across different environments, projects, and teams. This guide covers every method of loading variable files into playbooks, from simple `vars_files` to dynamic `include_vars`.

## vars_files in Playbooks

The most straightforward method is `vars_files` at the play level:

```yaml
# deploy.yml - Load variables from external files
---
- name: Deploy application
  hosts: webservers
  become: yes
  vars_files:
    - vars/common.yml
    - vars/app-config.yml
    - vars/database.yml

  tasks:
    - name: Deploy application
      template:
        src: config.yml.j2
        dest: "{{ app_dir }}/config.yml"
        owner: "{{ app_user }}"
        mode: '0640'
```

The variable files are standard YAML:

```yaml
# vars/common.yml
---
app_name: myapp
app_user: appuser
app_dir: /opt/myapp
app_port: 8080
log_dir: /var/log/myapp
```

```yaml
# vars/app-config.yml
---
app_workers: 4
app_timeout: 30
app_max_upload_size: 50M
app_features:
  - user_management
  - api_access
  - webhooks
```

```yaml
# vars/database.yml
---
db_host: db.example.com
db_port: 5432
db_name: myapp_production
db_pool_size: 20
db_timeout: 10
```

## Conditional Variable Files

Load different variable files based on the target system:

```yaml
# multi-os.yml - Load OS-specific variables
---
- name: Configure servers across operating systems
  hosts: all
  become: yes
  vars_files:
    - "vars/{{ ansible_os_family }}.yml"

  tasks:
    - name: Install web server package
      package:
        name: "{{ web_server_package }}"
        state: present

    - name: Start web server
      systemd:
        name: "{{ web_server_service }}"
        state: started
        enabled: yes
```

```yaml
# vars/Debian.yml
---
web_server_package: nginx
web_server_service: nginx
firewall_package: ufw
package_manager: apt
```

```yaml
# vars/RedHat.yml
---
web_server_package: nginx
web_server_service: nginx
firewall_package: firewalld
package_manager: yum
```

## vars_files with Fallback

Use a list of possible files with a fallback:

```yaml
# flexible-vars.yml - Load environment-specific vars with fallback
---
- name: Deploy with flexible variable loading
  hosts: all
  become: yes
  vars_files:
    # Try environment-specific file first, fall back to defaults
    - "vars/{{ env_name | default('development') }}.yml"
    - vars/defaults.yml

  tasks:
    - name: Show loaded configuration
      debug:
        msg: "Environment: {{ env_name }}, Debug: {{ app_debug }}, Workers: {{ app_workers }}"
```

If you need optional files (that may not exist), use `include_vars` with `ignore_errors`:

```yaml
# optional-vars.yml - Handle optional variable files
---
- name: Load optional overrides
  hosts: all

  tasks:
    - name: Load base variables
      include_vars:
        file: vars/base.yml

    - name: Load optional host-specific overrides
      include_vars:
        file: "vars/hosts/{{ inventory_hostname }}.yml"
      ignore_errors: yes  # File might not exist for every host
```

## include_vars Module

The `include_vars` module is more flexible than `vars_files` because it can run as a task, use conditions, and load entire directories:

```yaml
# dynamic-vars.yml - Dynamic variable loading
---
- name: Dynamically load variables
  hosts: all

  tasks:
    # Load a single file
    - name: Load application defaults
      include_vars:
        file: vars/app-defaults.yml

    # Load based on a condition
    - name: Load OS-specific variables
      include_vars:
        file: "vars/os/{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"

    # Load all files from a directory
    - name: Load all configuration files from vars/conf.d
      include_vars:
        dir: vars/conf.d
        extensions:
          - yml
          - yaml

    # Load into a specific variable name
    - name: Load users configuration
      include_vars:
        file: vars/users.yml
        name: user_config

    - name: Display loaded users
      debug:
        var: user_config
```

## Loading a Directory of Variable Files

The `include_vars` with `dir` parameter loads all YAML files from a directory. Files are loaded in alphabetical order:

```yaml
# dir-loading.yml - Load all files from a directory
---
- name: Load configuration from directory
  hosts: all

  tasks:
    - name: Load all configuration fragments
      include_vars:
        dir: vars/fragments
        extensions:
          - yml
        ignore_unknown_extensions: yes

    # Directory structure:
    # vars/fragments/
    #   01-base.yml
    #   02-networking.yml
    #   03-security.yml
    #   04-monitoring.yml
    # Files are loaded in order: 01, 02, 03, 04
```

This is useful for modular configurations where different teams manage different variable files:

```yaml
# vars/fragments/01-base.yml
---
app_name: myapp
app_version: "2.1.0"

# vars/fragments/02-networking.yml
---
listen_address: "0.0.0.0"
listen_port: 8080
allowed_ips:
  - 10.0.0.0/8

# vars/fragments/03-security.yml
---
ssl_enabled: true
ssl_protocols: "TLSv1.2 TLSv1.3"
password_min_length: 12
```

## Command-Line Variable Files with -e @

You can load variable files from the command line using the `-e @` syntax:

```bash
# Load a variable file from the command line
ansible-playbook deploy.yml -e @vars/production.yml

# Load multiple variable files
ansible-playbook deploy.yml -e @vars/base.yml -e @vars/production.yml -e @vars/secrets.yml

# Combine file and inline variables (inline takes precedence)
ansible-playbook deploy.yml -e @vars/production.yml -e "version=2.1.0 debug=false"
```

This is powerful in CI/CD pipelines:

```bash
#!/bin/bash
# ci-deploy.sh - CI/CD deployment script
ENV="${DEPLOY_ENV:-staging}"

ansible-playbook deploy.yml \
  -i "inventories/${ENV}/hosts.ini" \
  -e "@vars/base.yml" \
  -e "@vars/${ENV}.yml" \
  -e "@vars/secrets/${ENV}.vault.yml" \
  -e "version=${BUILD_VERSION}" \
  --vault-password-file=~/.vault_pass
```

## Encrypted Variable Files

Variable files can be encrypted with Ansible Vault:

```bash
# Encrypt a variable file
ansible-vault encrypt vars/secrets.yml

# Create a new encrypted file
ansible-vault create vars/production-secrets.yml

# Edit an encrypted file
ansible-vault edit vars/production-secrets.yml
```

Use encrypted files just like regular files:

```yaml
# secure-deploy.yml - Mix encrypted and plain variable files
---
- name: Deploy with encrypted variables
  hosts: webservers
  become: yes
  vars_files:
    - vars/common.yml              # Plain text
    - vars/production-secrets.yml  # Vault encrypted

  tasks:
    - name: Configure database connection
      template:
        src: database.yml.j2
        dest: /etc/myapp/database.yml
        mode: '0600'
      no_log: true  # Prevent secrets from showing in output
```

## Variable Precedence with Files

Variables from different sources have different precedence. Here is the order relevant to variable files (lowest to highest):

```yaml
# 1. role/defaults/main.yml (lowest)
# 2. group_vars/all
# 3. group_vars/specific_group
# 4. host_vars/hostname
# 5. play vars_files
# 6. play vars
# 7. include_vars (task level)
# 8. set_fact / register
# 9. extra vars -e (highest)
```

Practical example:

```yaml
# roles/myapp/defaults/main.yml - Can be overridden by everything
---
app_workers: 2
app_debug: false
```

```yaml
# vars/production.yml - Loaded via vars_files (higher precedence)
---
app_workers: 8
```

```bash
# Extra vars override everything
ansible-playbook deploy.yml -e "app_workers=16"
```

## Practical Example: Multi-Tier Application Configuration

Here is a complete example of a project that uses variable files extensively:

```yaml
# deploy-app.yml - Full application deployment with variable files
---
- name: Deploy multi-tier application
  hosts: all
  become: yes

  vars_files:
    - vars/base.yml
    - "vars/{{ env_name }}.yml"

  pre_tasks:
    - name: Load OS-specific variables
      include_vars:
        file: "vars/os/{{ ansible_os_family }}.yml"

    - name: Load role-specific variables for this host
      include_vars:
        file: "vars/roles/{{ item }}.yml"
      loop: "{{ group_names }}"
      ignore_errors: yes

  roles:
    - common
    - role: webserver
      when: "'webservers' in group_names"
    - role: database
      when: "'dbservers' in group_names"
```

```yaml
# vars/base.yml - Shared across all environments
---
app_name: myapp
app_user: appuser
timezone: UTC
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org
ssh_port: 22
```

```yaml
# vars/production.yml - Production overrides
---
env_name: production
app_debug: false
app_log_level: warning
app_workers: "{{ ansible_processor_vcpus * 2 }}"
ssl_enabled: true
firewall_enabled: true
monitoring_enabled: true
```

```yaml
# vars/roles/webservers.yml - Variables for web server hosts
---
nginx_worker_processes: auto
nginx_sites:
  - name: myapp
    domain: "{{ domain }}"
    port: "{{ app_port }}"
    ssl: "{{ ssl_enabled }}"
```

## Summary

Variable files are the backbone of reusable Ansible playbooks. Use `vars_files` for play-level variable loading, `include_vars` for dynamic and conditional loading, and `-e @file` for command-line overrides. Organize your variable files by purpose (base, environment, OS, secrets) and encrypt sensitive files with Ansible Vault. The goal is to write playbooks once and control their behavior entirely through variables.
