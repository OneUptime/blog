# How to Define Group Variables in Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Group Variables, DevOps, Automation

Description: A practical guide to defining and organizing group variables in Ansible inventory using inline definitions, group_vars directories, and variable precedence rules.

---

Group variables apply a set of configuration values to every host in a group. Instead of duplicating the same variable across dozens of host entries, you define it once at the group level and every member inherits it. This is one of the most powerful features of Ansible inventory, and getting it right will save you hours of maintenance.

## Inline Group Variables in INI Format

In INI inventory, you define group variables using the `[groupname:vars]` section.

```ini
# inventory.ini
# Define groups and their variables

[webservers]
web1.example.com
web2.example.com
web3.example.com

# All web servers share these settings
[webservers:vars]
ansible_user=deploy
http_port=80
document_root=/var/www/html
nginx_worker_processes=auto

[databases]
db-primary.example.com
db-replica-01.example.com
db-replica-02.example.com

# All database servers share these settings
[databases:vars]
ansible_user=dbadmin
postgresql_version=16
listen_port=5432
max_connections=200
```

Every host in `webservers` gets `http_port=80`, `document_root=/var/www/html`, and the other variables. If a specific host needs a different value, you can override it at the host level.

## Inline Group Variables in YAML Format

In YAML inventory, group variables go under the `vars` key inside a group.

```yaml
# inventory.yml
# Group variables with proper YAML data types
all:
  children:
    webservers:
      vars:
        ansible_user: deploy
        http_port: 80
        ssl_enabled: true
        allowed_methods:
          - GET
          - POST
          - PUT
          - DELETE
        nginx_config:
          worker_processes: auto
          worker_connections: 2048
          keepalive_timeout: 65
      hosts:
        web1.example.com:
          ansible_host: 10.0.1.10
        web2.example.com:
          ansible_host: 10.0.1.11

    databases:
      vars:
        ansible_user: dbadmin
        postgresql_version: 16
        pg_hba_rules:
          - type: local
            database: all
            user: all
            method: peer
          - type: host
            database: all
            user: all
            address: "10.0.0.0/8"
            method: md5
      hosts:
        db-primary.example.com:
          ansible_host: 10.0.2.10
        db-replica.example.com:
          ansible_host: 10.0.2.11
```

YAML lets you use lists and nested dictionaries as group variables, which is not possible with INI format.

## The group_vars Directory

For any project beyond a quick prototype, use the `group_vars` directory. This is the standard way to organize group variables in Ansible.

Create a `group_vars` directory alongside your inventory file:

```
project/
  ansible.cfg
  inventory.ini
  group_vars/
    all.yml
    webservers.yml
    databases.yml
    loadbalancers.yml
  playbooks/
    site.yml
```

Each file is named after the group it applies to.

```yaml
# group_vars/all.yml
# Variables that apply to EVERY host in the inventory
ansible_python_interpreter: /usr/bin/python3
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org
dns_servers:
  - 10.0.0.2
  - 10.0.0.3
timezone: UTC
locale: en_US.UTF-8
```

```yaml
# group_vars/webservers.yml
# Variables for all web servers
ansible_user: deploy
nginx_version: "1.24"
nginx_worker_processes: auto
nginx_worker_connections: 4096

ssl_certificate: /etc/ssl/certs/wildcard.example.com.pem
ssl_certificate_key: /etc/ssl/private/wildcard.example.com.key

firewall_allowed_ports:
  - 80
  - 443

log_rotation:
  max_size: 100M
  keep_days: 30
  compress: true
```

```yaml
# group_vars/databases.yml
# Variables for all database servers
ansible_user: dbadmin
postgresql_version: 16
postgresql_data_dir: /var/lib/postgresql/16/main
postgresql_conf_dir: /etc/postgresql/16/main

pg_settings:
  max_connections: 200
  shared_buffers: 4GB
  effective_cache_size: 12GB
  work_mem: 64MB
  maintenance_work_mem: 512MB
  wal_level: replica

backup_config:
  enabled: true
  tool: pgbackrest
  schedule: "0 2 * * *"
  retention_full: 2
  retention_diff: 7
  s3_bucket: my-db-backups
```

## Splitting group_vars into Multiple Files

For groups with lots of variables, you can use a directory instead of a single file.

```
project/
  inventory.ini
  group_vars/
    all/
      connection.yml
      ntp.yml
      dns.yml
    webservers/
      nginx.yml
      ssl.yml
      firewall.yml
    databases/
      postgresql.yml
      backup.yml
      monitoring.yml
```

Ansible loads all YAML files inside the directory and merges them. This is great for separating concerns:

```yaml
# group_vars/webservers/nginx.yml
# Nginx-specific settings for web servers
nginx_version: "1.24"
nginx_worker_processes: auto
nginx_worker_connections: 4096
nginx_client_max_body_size: 50m
nginx_proxy_read_timeout: 300
```

```yaml
# group_vars/webservers/ssl.yml
# SSL/TLS settings for web servers
ssl_protocols: "TLSv1.2 TLSv1.3"
ssl_ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
ssl_certificate: /etc/ssl/certs/wildcard.example.com.pem
ssl_certificate_key: /etc/ssl/private/wildcard.example.com.key
ssl_session_timeout: 1d
ssl_session_cache: "shared:SSL:50m"
```

```yaml
# group_vars/webservers/firewall.yml
# Firewall rules for web servers
firewall_enabled: true
firewall_default_policy: deny
firewall_allowed_ports:
  - port: 80
    proto: tcp
    source: any
  - port: 443
    proto: tcp
    source: any
  - port: 22
    proto: tcp
    source: 10.0.0.0/8
```

## Variables for the all Group

The `all` group is special. Every host belongs to it, so variables defined in `group_vars/all.yml` serve as global defaults.

```yaml
# group_vars/all.yml
# Global defaults for all hosts
ansible_user: admin
ansible_python_interpreter: /usr/bin/python3
ansible_become: true
ansible_become_method: sudo

env: production
company: example
domain: example.com

monitoring:
  enabled: true
  agent: prometheus-node-exporter
  port: 9100
```

Individual group or host variables can override any of these defaults.

## Variable Precedence Between Groups

When a host belongs to multiple groups, the precedence follows this order (lowest to highest):

```mermaid
graph LR
    A["group_vars/all"] --> B["parent group vars"]
    B --> C["child group vars"]
    C --> D["host_vars"]
    D --> E["play/task vars"]
```

When two groups at the same level both set the same variable, Ansible sorts group names alphabetically and the last one wins. This can be surprising.

```yaml
# inventory.yml
all:
  children:
    alpha_group:
      vars:
        my_var: from_alpha
      hosts:
        server1.example.com:
    beta_group:
      vars:
        my_var: from_beta
      hosts:
        server1.example.com:
```

Here, `server1.example.com` is in both groups. Because `beta_group` sorts after `alpha_group` alphabetically, `my_var` will be `from_beta`. If you need deterministic precedence, use `ansible_group_priority`:

```yaml
# group_vars/alpha_group.yml
ansible_group_priority: 10
my_var: from_alpha

# group_vars/beta_group.yml
ansible_group_priority: 5
my_var: from_beta
```

Now `alpha_group` wins because it has higher priority, regardless of alphabetical order.

## Using Group Variables in Playbooks

Reference group variables just like any other variable in your playbooks and templates.

```yaml
# playbooks/deploy-web.yml
# Playbook using group variables
- hosts: webservers
  become: true
  tasks:
    - name: Install nginx
      apt:
        name: "nginx={{ nginx_version }}*"
        state: present

    - name: Configure nginx worker settings
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: reload nginx

    - name: Open firewall ports
      ufw:
        rule: allow
        port: "{{ item.port }}"
        proto: "{{ item.proto }}"
      loop: "{{ firewall_allowed_ports }}"

  handlers:
    - name: reload nginx
      service:
        name: nginx
        state: reloaded
```

The template uses the group variables directly:

```jinja2
# templates/nginx.conf.j2
worker_processes {{ nginx_worker_processes }};

events {
    worker_connections {{ nginx_worker_connections }};
}

http {
    client_max_body_size {{ nginx_client_max_body_size }};

    ssl_protocols {{ ssl_protocols }};
    ssl_ciphers {{ ssl_ciphers }};
}
```

## Encrypting Sensitive Group Variables with Vault

Group variables often contain secrets like database passwords or API keys. Use Ansible Vault to encrypt them.

```bash
# Create an encrypted group variables file
ansible-vault create group_vars/databases/vault.yml
```

```yaml
# group_vars/databases/vault.yml (encrypted)
vault_db_password: "super-secret-password"
vault_replication_password: "another-secret"
vault_backup_encryption_key: "backup-key-here"
```

Reference the vaulted variables from your regular group_vars files:

```yaml
# group_vars/databases/postgresql.yml
# Reference vault variables with the vault_ prefix convention
db_password: "{{ vault_db_password }}"
replication_password: "{{ vault_replication_password }}"
```

## Best Practices

1. **Use group_vars directory, not inline vars.** Inline variables are fine for quick tests but become unmaintainable in real projects.

2. **Keep group_vars/all.yml lean.** Only put truly universal settings there. If it does not apply to every single host, it belongs in a more specific group.

3. **Name groups clearly.** Good group names make the variable files self-documenting. `group_vars/production_webservers.yml` tells you exactly what is inside.

4. **Use the vault_ prefix convention.** Prefix encrypted variables with `vault_` and reference them from non-encrypted files. This makes it clear which values are secrets.

5. **Split large group_vars files.** When a file exceeds 50-60 lines, break it into logical pieces using the directory approach.

Group variables are the backbone of a scalable Ansible setup. Get the structure right early, and your playbooks will stay clean as your infrastructure grows from a handful of servers to hundreds.
