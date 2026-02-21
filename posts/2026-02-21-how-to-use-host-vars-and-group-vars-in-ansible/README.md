# How to Use host_vars and group_vars in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Inventory, DevOps, Configuration Management

Description: Learn how to use host_vars and group_vars directories to organize Ansible variables by host and group for cleaner, more maintainable playbooks.

---

As your Ansible project grows beyond a handful of hosts, managing variables becomes a real challenge. Stuffing everything into the inventory file or into play-level `vars` blocks quickly becomes unmanageable. The `host_vars` and `group_vars` directories solve this by giving each host and each group their own dedicated variable files. Ansible automatically loads these files based on the inventory, so your playbooks stay clean and your variables stay organized.

## Directory Structure

The `host_vars` and `group_vars` directories can live alongside your inventory file or at the playbook level:

```
project/
  ansible.cfg
  inventory/
    hosts.yml
    group_vars/
      all.yml              # Variables for every host
      webservers.yml        # Variables for the webservers group
      databases.yml         # Variables for the databases group
      webservers/
        vars.yml            # Plain text variables
        vault.yml           # Encrypted variables
    host_vars/
      web01.yml             # Variables for web01 only
      web02.yml             # Variables for web02 only
      db01/
        vars.yml
        vault.yml
  playbooks/
    deploy.yml
    maintenance.yml
```

You can use either a single file (`webservers.yml`) or a directory containing multiple files (`webservers/vars.yml`, `webservers/vault.yml`). When you use a directory, Ansible loads all YAML files inside it alphabetically.

## The Inventory

Here is the inventory that maps to the directory structure above:

```yaml
# inventory/hosts.yml
all:
  children:
    webservers:
      hosts:
        web01:
          ansible_host: 10.0.1.10
        web02:
          ansible_host: 10.0.1.11
    databases:
      hosts:
        db01:
          ansible_host: 10.0.2.10
        db02:
          ansible_host: 10.0.2.11
    loadbalancers:
      hosts:
        lb01:
          ansible_host: 10.0.0.10
```

## group_vars Examples

### The all Group

The `all` group applies to every host in your inventory. Use it for truly global settings:

```yaml
# inventory/group_vars/all.yml
# Variables that apply to every host in the inventory

# Common SSH settings
ansible_user: deploy
ansible_python_interpreter: /usr/bin/python3

# NTP servers used by all hosts
ntp_servers:
  - ntp1.internal.example.com
  - ntp2.internal.example.com

# DNS settings
dns_servers:
  - 10.0.0.2
  - 10.0.0.3

# Monitoring agent settings
monitoring_enabled: true
monitoring_endpoint: https://monitoring.example.com/api
monitoring_interval: 60

# Common security settings
ssh_permit_root_login: false
ssh_password_auth: false
```

### Group-Specific Variables

```yaml
# inventory/group_vars/webservers.yml
# Variables for all web servers

# Nginx settings
nginx_worker_processes: auto
nginx_worker_connections: 4096
nginx_keepalive_timeout: 65

# Application settings
app_name: mywebapp
app_user: webapp
app_group: webapp
app_port: 8080
app_workers: 4

# SSL certificates
ssl_certificate: /etc/ssl/certs/webapp.pem
ssl_certificate_key: /etc/ssl/private/webapp.key

# Log rotation
logrotate_days: 14
logrotate_count: 30
```

```yaml
# inventory/group_vars/databases.yml
# Variables for all database servers

# PostgreSQL settings
postgres_version: 15
postgres_port: 5432
postgres_data_dir: /var/lib/postgresql/{{ postgres_version }}/main
postgres_max_connections: 200
postgres_shared_buffers: 4GB
postgres_effective_cache_size: 12GB
postgres_work_mem: 64MB

# Backup settings
backup_enabled: true
backup_schedule: "0 2 * * *"
backup_retention_days: 30
backup_destination: s3://db-backups/{{ inventory_hostname }}
```

## host_vars Examples

Host variables override group variables and let you configure individual hosts:

```yaml
# inventory/host_vars/web01.yml
# Variables specific to the web01 server

# This host handles more traffic, so increase workers
app_workers: 8
nginx_worker_connections: 8192

# This host also runs the admin panel
admin_panel_enabled: true
admin_panel_port: 9090

# Custom SSL for this specific host
ssl_certificate: /etc/ssl/certs/web01.example.com.pem
ssl_certificate_key: /etc/ssl/private/web01.example.com.key
```

```yaml
# inventory/host_vars/web02.yml
# Variables specific to the web02 server

# Standard configuration
app_workers: 4

# This host does not run the admin panel
admin_panel_enabled: false
```

```yaml
# inventory/host_vars/db01/vars.yml
# Variables for the primary database server

postgres_role: primary
postgres_max_connections: 300
postgres_shared_buffers: 8GB

# Replication settings
replication_enabled: true
replication_slots:
  - name: db02_replica
    type: physical
```

## Using the Variables in Playbooks

The beauty of `host_vars` and `group_vars` is that you do not need to reference them explicitly in your playbooks. Ansible loads them automatically:

```yaml
---
# deploy-webservers.yml
# All variables from group_vars/webservers.yml and host_vars/web0X.yml
# are automatically available without any vars_files or include_vars

- hosts: webservers
  become: yes
  tasks:
    - name: Create application user
      user:
        name: "{{ app_user }}"
        group: "{{ app_group }}"
        system: yes

    - name: Deploy nginx config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: reload nginx

    - name: Deploy application config
      template:
        src: templates/app.conf.j2
        dest: /opt/{{ app_name }}/config.yml
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
      notify: restart app

    # This task only runs on hosts where admin_panel_enabled is true
    - name: Deploy admin panel configuration
      template:
        src: templates/admin.conf.j2
        dest: /etc/nginx/sites-available/admin.conf
      when: admin_panel_enabled | default(false)
      notify: reload nginx

    - name: Show host configuration summary
      debug:
        msg: >
          Host {{ inventory_hostname }}:
          Workers={{ app_workers }},
          Port={{ app_port }},
          Admin={{ admin_panel_enabled | default(false) }}

  handlers:
    - name: reload nginx
      service:
        name: nginx
        state: reloaded

    - name: restart app
      service:
        name: "{{ app_name }}"
        state: restarted
```

## Multiple Environment Inventories

A common pattern is to have separate inventory directories per environment, each with their own `group_vars` and `host_vars`:

```
inventories/
  production/
    hosts.yml
    group_vars/
      all.yml
      webservers.yml
      databases.yml
    host_vars/
      web01.yml
      web02.yml
  staging/
    hosts.yml
    group_vars/
      all.yml
      webservers.yml
      databases.yml
    host_vars/
      staging-web01.yml
```

Run playbooks against a specific environment by pointing to the right inventory:

```bash
# Deploy to staging
ansible-playbook deploy.yml -i inventories/staging/

# Deploy to production
ansible-playbook deploy.yml -i inventories/production/
```

## Variable Precedence Between group_vars and host_vars

When a host belongs to multiple groups, variables merge in a specific order. Here is the simplified precedence (lowest to highest):

1. `group_vars/all` (lowest)
2. `group_vars/<parent_group>`
3. `group_vars/<child_group>`
4. `host_vars/<hostname>` (highest)

```yaml
# group_vars/all.yml
log_level: info           # Default for everyone

# group_vars/webservers.yml
log_level: warn           # Overrides all.yml for web servers

# host_vars/web01.yml
log_level: debug          # Overrides webservers.yml for web01 only
```

When web01 runs, `log_level` will be `debug`. When web02 runs (without a host_vars override), `log_level` will be `warn`.

## Verifying Variable Loading

Use the `debug` module or `ansible-inventory` to verify which variables are loaded for a host:

```bash
# Show all variables for a specific host
ansible-inventory -i inventory/ --host web01 --yaml

# Show the full inventory graph with variable sources
ansible-inventory -i inventory/ --graph --vars
```

From within a playbook:

```yaml
# Show all variables available to a host (useful for debugging)
- name: Dump all host variables
  debug:
    var: hostvars[inventory_hostname]
```

## Best Practices

1. Use `group_vars/all.yml` for defaults that apply everywhere, then override in more specific group or host files.
2. Keep secrets in a separate `vault.yml` file inside the group or host directory.
3. Prefix vault variable names with `vault_` and map them in `vars.yml` for clarity.
4. Do not define the same variable in multiple group files unless you understand the precedence rules and intend to override.
5. Use `ansible-inventory --host <name>` to debug which variables a host actually sees.

## Wrapping Up

The `host_vars` and `group_vars` directories are the standard way to organize variables in any non-trivial Ansible project. They keep your playbooks clean by moving configuration data out of the playbook logic. Group vars handle shared settings across hosts with the same role, while host vars handle the exceptions and host-specific overrides. Combined with per-environment inventory directories, this structure scales cleanly from a dozen hosts to thousands.
