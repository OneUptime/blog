# How to Configure Ansible Inventory Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, DevOps, Configuration Management, Infrastructure

Description: Master Ansible inventory management with static files, dynamic sources, groups, variables, and patterns to efficiently organize and target your infrastructure.

---

The inventory is the foundation of Ansible automation. It defines which hosts you manage, how they are grouped, and what variables apply to them. A well-organized inventory makes playbooks cleaner and operations safer by letting you target exactly the right servers.

This guide covers inventory formats, grouping strategies, variable inheritance, and patterns for selecting hosts.

## Static Inventory Basics

The simplest inventory is a text file listing hostnames or IP addresses.

### INI Format

```ini
# inventory/hosts.ini
# Basic inventory with groups and host variables

# Ungrouped hosts (not recommended for production)
bastion.example.com

# Web server group
[webservers]
web1.example.com ansible_host=192.168.1.10
web2.example.com ansible_host=192.168.1.11
web3.example.com ansible_host=192.168.1.12

# Database servers with custom SSH port
[databases]
db1.example.com ansible_host=192.168.1.20 ansible_port=2222
db2.example.com ansible_host=192.168.1.21 ansible_port=2222

# Cache servers
[cache]
redis1.example.com
redis2.example.com

# Create parent groups using :children suffix
[backend:children]
databases
cache

# Apply variables to all hosts in a group using :vars suffix
[webservers:vars]
http_port=80
max_connections=1000

[databases:vars]
db_port=5432
backup_enabled=true
```

### YAML Format

YAML provides more flexibility for complex structures.

```yaml
# inventory/hosts.yml
---
all:
  children:
    webservers:
      hosts:
        web1.example.com:
          ansible_host: 192.168.1.10
          nginx_worker_processes: 4
        web2.example.com:
          ansible_host: 192.168.1.11
        web3.example.com:
          ansible_host: 192.168.1.12
      vars:
        http_port: 80
        https_port: 443

    databases:
      hosts:
        db1.example.com:
          ansible_host: 192.168.1.20
          postgresql_max_connections: 200
        db2.example.com:
          ansible_host: 192.168.1.21
          postgresql_max_connections: 100
      vars:
        db_port: 5432
        backup_enabled: true

    cache:
      hosts:
        redis1.example.com:
        redis2.example.com:
      vars:
        redis_port: 6379

    # Group of groups
    backend:
      children:
        databases:
        cache:

    # Environment groupings
    production:
      children:
        webservers:
        backend:
```

## Inventory Directory Structure

For larger infrastructures, split inventory into multiple files organized by concern.

```
inventory/
├── hosts.yml                    # Main host definitions
├── group_vars/
│   ├── all.yml                  # Variables for all hosts
│   ├── all/
│   │   ├── vars.yml             # Non-sensitive variables
│   │   └── vault.yml            # Encrypted secrets
│   ├── webservers.yml           # Web server variables
│   ├── databases.yml            # Database variables
│   └── production.yml           # Production environment variables
├── host_vars/
│   ├── web1.example.com.yml     # Host-specific variables
│   └── db1.example.com.yml
└── dynamic/
    └── aws_ec2.yml              # Dynamic inventory source
```

Ansible automatically loads files from `group_vars/` and `host_vars/` directories.

## Variable Precedence

Understanding variable precedence prevents unexpected behavior. From lowest to highest priority:

```yaml
# 1. Role defaults (roles/myrole/defaults/main.yml)
# 2. Inventory file group_vars
# 3. Inventory group_vars/all
# 4. Playbook group_vars/all
# 5. Inventory group_vars/*
# 6. Playbook group_vars/*
# 7. Inventory file host_vars
# 8. Inventory host_vars/*
# 9. Playbook host_vars/*
# 10. Host facts
# 11. Play vars
# 12. Play vars_prompt
# 13. Play vars_files
# 14. Role vars (roles/myrole/vars/main.yml)
# 15. Block vars
# 16. Task vars
# 17. Include vars
# 18. Set facts / registered vars
# 19. Role params
# 20. Extra vars (-e) - highest priority, always wins
```

## Group Variables

Define variables that apply to all hosts in a group.

```yaml
# inventory/group_vars/webservers.yml
---
# Application settings
app_name: frontend
app_user: www-data
app_path: /var/www/app

# Nginx configuration
nginx_worker_processes: auto
nginx_worker_connections: 4096
nginx_client_max_body_size: 50M

# Monitoring
prometheus_node_exporter_port: 9100
prometheus_scrape_interval: 15s

# Feature flags
enable_ssl: true
enable_http2: true
```

```yaml
# inventory/group_vars/databases.yml
---
# PostgreSQL settings
postgresql_version: 15
postgresql_port: 5432
postgresql_max_connections: 200
postgresql_shared_buffers: 256MB

# Backup configuration
backup_enabled: true
backup_retention_days: 30
backup_s3_bucket: company-db-backups

# Replication
replication_enabled: true
replication_user: replicator
```

## Host Variables

Override group variables for specific hosts.

```yaml
# inventory/host_vars/web1.example.com.yml
---
# This server handles more traffic
nginx_worker_processes: 8
nginx_worker_connections: 8192

# Different application version for canary deployment
app_version: "2.1.0-beta"

# Host-specific SSL certificate paths
ssl_certificate: /etc/ssl/certs/web1.example.com.crt
ssl_certificate_key: /etc/ssl/private/web1.example.com.key
```

```yaml
# inventory/host_vars/db1.example.com.yml
---
# Primary database server
postgresql_role: primary
postgresql_max_connections: 500

# Higher resources for primary
postgresql_shared_buffers: 1GB
postgresql_effective_cache_size: 3GB
```

## Environment-Based Organization

Separate inventories per environment for safety.

```
inventory/
├── production/
│   ├── hosts.yml
│   ├── group_vars/
│   └── host_vars/
├── staging/
│   ├── hosts.yml
│   ├── group_vars/
│   └── host_vars/
└── development/
    ├── hosts.yml
    ├── group_vars/
    └── host_vars/
```

```bash
# Target specific environment
ansible-playbook playbooks/deploy.yml -i inventory/staging/

# Compare environments
ansible-inventory -i inventory/production/ --list | jq '.webservers.hosts'
ansible-inventory -i inventory/staging/ --list | jq '.webservers.hosts'
```

## Host Patterns and Targeting

Use patterns to select hosts for operations.

```bash
# All hosts
ansible all -m ping

# Single group
ansible webservers -m ping

# Multiple groups (OR)
ansible 'webservers:databases' -m ping

# Intersection (AND) - hosts in both groups
ansible 'webservers:&production' -m ping

# Exclusion - webservers but not in maintenance
ansible 'webservers:!maintenance' -m ping

# Wildcard patterns
ansible 'web*.example.com' -m ping
ansible '192.168.1.*' -m ping

# Regex patterns (prefix with ~)
ansible '~web[0-9]+\.example\.com' -m ping

# Numeric ranges
ansible 'web[1:5].example.com' -m ping

# Combine patterns
ansible 'webservers:&production:!maintenance' -m ping
```

## Inventory Aliases and Connection Settings

Configure how Ansible connects to each host.

```yaml
# inventory/hosts.yml
---
all:
  hosts:
    # Host with jump/bastion host
    internal-server:
      ansible_host: 10.0.0.50
      ansible_ssh_common_args: '-o ProxyJump=bastion.example.com'

    # Host with different SSH key
    legacy-server:
      ansible_host: 192.168.1.100
      ansible_user: admin
      ansible_ssh_private_key_file: ~/.ssh/legacy_key

    # Host using password authentication (not recommended)
    test-server:
      ansible_host: 192.168.1.200
      ansible_user: testuser
      ansible_password: "{{ vault_test_password }}"

    # Local connection (no SSH)
    localhost:
      ansible_connection: local

    # Windows host using WinRM
    windows-server:
      ansible_host: 192.168.1.150
      ansible_connection: winrm
      ansible_winrm_transport: ntlm
      ansible_user: Administrator
      ansible_password: "{{ vault_windows_password }}"

    # Docker container
    app-container:
      ansible_connection: docker
      ansible_docker_extra_args: "--tlsverify"
```

## Validating Inventory

Check your inventory configuration before running playbooks.

```bash
# List all hosts in JSON format
ansible-inventory --list

# List in YAML format (easier to read)
ansible-inventory --list -y

# Show inventory graph
ansible-inventory --graph

# Example output:
# @all:
#   |--@ungrouped:
#   |--@webservers:
#   |  |--web1.example.com
#   |  |--web2.example.com
#   |--@databases:
#   |  |--db1.example.com
#   |--@backend:
#   |  |--@databases:
#   |  |--@cache:

# Show specific host details
ansible-inventory --host web1.example.com

# Verify hosts match a pattern
ansible webservers --list-hosts
```

## Inventory Plugins

Ansible supports various inventory plugins for different sources.

```yaml
# ansible.cfg
[inventory]
# Enable specific plugins
enable_plugins = host_list, script, auto, yaml, ini, toml

# Plugin-specific settings
[inventory_plugin_aws_ec2]
cache = yes
cache_timeout = 300
```

```yaml
# inventory/aws_ec2.yml
# AWS EC2 dynamic inventory
plugin: aws_ec2
regions:
  - us-east-1
  - us-west-2
keyed_groups:
  - key: tags.Environment
    prefix: env
  - key: instance_type
    prefix: type
filters:
  instance-state-name: running
compose:
  ansible_host: public_ip_address
```

## Best Practices for Inventory Organization

1. **Use meaningful group names**: `webservers` over `group1`
2. **Separate concerns**: Environment, role, and region should be different group hierarchies
3. **Encrypt secrets**: Never store plaintext passwords in inventory files
4. **Version control**: Keep inventory in Git alongside playbooks
5. **Document conventions**: Add comments explaining group purposes
6. **Use directories**: Split large inventories into multiple files
7. **Validate regularly**: Run `ansible-inventory --list` in CI to catch syntax errors

```yaml
# inventory/group_vars/all.yml
# Document your variable conventions
---
# === Naming Conventions ===
# app_*     - Application-specific settings
# nginx_*   - Nginx web server configuration
# db_*      - Database settings
# backup_*  - Backup and recovery settings
# vault_*   - Encrypted secrets (in vault.yml)

# === Global Settings ===
timezone: UTC
ntp_servers:
  - time.google.com
  - time.cloudflare.com

# === Monitoring ===
prometheus_enabled: true
prometheus_node_exporter_version: "1.5.0"
```

---

A well-organized inventory is the backbone of manageable Ansible automation. Take time to design your group hierarchy, establish variable naming conventions, and separate environments cleanly. Your future self will thank you when you need to make changes to production at 2 AM and can confidently target exactly the right hosts.
