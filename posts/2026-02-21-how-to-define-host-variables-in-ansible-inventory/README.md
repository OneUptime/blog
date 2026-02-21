# How to Define Host Variables in Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Host Variables, DevOps, Configuration Management

Description: Learn every method for defining host-specific variables in Ansible inventory files, host_vars directories, and playbooks with practical examples and precedence rules.

---

Host variables let you assign configuration values to individual machines in your Ansible inventory. When each server needs slightly different settings, like a unique IP address, a specific application port, or a custom database name, host variables are the mechanism that makes that possible.

This guide covers all the ways to define host variables, when to use each approach, and how variable precedence works when values collide.

## Inline Host Variables in INI Format

The quickest way to set a host variable is directly in the inventory file, on the same line as the hostname.

```ini
# inventory.ini
# Variables follow the hostname, separated by spaces
[webservers]
web1.example.com ansible_host=10.0.1.10 http_port=8080 max_workers=4
web2.example.com ansible_host=10.0.1.11 http_port=8081 max_workers=8
web3.example.com ansible_host=10.0.1.12 http_port=8082 max_workers=4

[databases]
db-primary.example.com ansible_host=10.0.2.10 pg_role=primary replication_slots=3
db-replica.example.com ansible_host=10.0.2.11 pg_role=replica read_only=true
```

This works fine for a handful of variables, but the lines get long and hard to read once you add more than three or four values.

## Inline Host Variables in YAML Format

YAML inventory gives you a cleaner structure with proper data types.

```yaml
# inventory.yml
# Host variables nested under each hostname
all:
  children:
    webservers:
      hosts:
        web1.example.com:
          ansible_host: 10.0.1.10
          http_port: 8080
          max_workers: 4
          ssl_enabled: true
          vhosts:
            - name: app.example.com
              root: /var/www/app
            - name: api.example.com
              root: /var/www/api
        web2.example.com:
          ansible_host: 10.0.1.11
          http_port: 8081
          max_workers: 8
          ssl_enabled: true
          vhosts:
            - name: app.example.com
              root: /var/www/app
```

With YAML, you get lists and dictionaries as variable values. That `vhosts` list would be impossible to represent cleanly in INI format.

## Using the host_vars Directory

For anything beyond trivial setups, the `host_vars` directory is the recommended approach. Create a directory called `host_vars` next to your inventory file, and inside it, create a YAML file named after each host.

```
project/
  inventory.ini
  host_vars/
    web1.example.com.yml
    web2.example.com.yml
    db-primary.example.com.yml
    db-replica.example.com.yml
```

Each file contains variables for that specific host:

```yaml
# host_vars/web1.example.com.yml
# All variables specific to web1
ansible_host: 10.0.1.10
http_port: 8080
max_workers: 4
ssl_enabled: true

nginx_config:
  worker_connections: 2048
  keepalive_timeout: 65
  client_max_body_size: 50m

app_config:
  database_url: "postgresql://app:secret@db-primary.example.com:5432/myapp"
  redis_url: "redis://cache-01.example.com:6379/0"
  secret_key: "{{ vault_web1_secret_key }}"
```

```yaml
# host_vars/db-primary.example.com.yml
# Database primary server configuration
ansible_host: 10.0.2.10
pg_role: primary

postgresql:
  version: 16
  max_connections: 200
  shared_buffers: 4GB
  effective_cache_size: 12GB
  wal_level: replica
  max_wal_senders: 5

backup:
  enabled: true
  schedule: "0 2 * * *"
  retention_days: 30
  destination: s3://backups/db-primary/
```

This approach keeps your inventory file clean and gives you version control history for each host's configuration separately.

## Splitting host_vars into Multiple Files

You can also use a directory instead of a single file per host. Ansible will load all YAML files inside that directory.

```
project/
  inventory.ini
  host_vars/
    web1.example.com/
      connection.yml
      nginx.yml
      app.yml
    db-primary.example.com/
      connection.yml
      postgresql.yml
      backup.yml
```

```yaml
# host_vars/web1.example.com/connection.yml
# Connection-specific variables
ansible_host: 10.0.1.10
ansible_user: deploy
ansible_port: 22
ansible_python_interpreter: /usr/bin/python3
```

```yaml
# host_vars/web1.example.com/nginx.yml
# Nginx configuration variables
nginx_worker_processes: auto
nginx_worker_connections: 2048
nginx_keepalive_timeout: 65
nginx_client_max_body_size: 50m
nginx_ssl_protocols: "TLSv1.2 TLSv1.3"
```

```yaml
# host_vars/web1.example.com/app.yml
# Application-specific variables
app_name: myapp
app_version: "2.4.1"
app_environment: production
app_workers: 4
app_database_url: "postgresql://app@db-primary:5432/myapp"
```

This keeps related variables together and makes it easy for different team members to own different parts of the configuration.

## Ansible Built-in Host Variables

Ansible reserves several variable names for controlling connections and behavior. Here are the most commonly used ones:

```yaml
# host_vars/special-server.example.com.yml
# Built-in Ansible connection variables

# Network connection
ansible_host: 10.0.1.50           # IP address to connect to
ansible_port: 2222                 # SSH port (default: 22)
ansible_user: deployer             # SSH username
ansible_password: "{{ vault_pw }}" # SSH password (use vault!)

# SSH settings
ansible_ssh_private_key_file: ~/.ssh/special_key
ansible_ssh_common_args: "-o StrictHostKeyChecking=no"

# Privilege escalation
ansible_become: true
ansible_become_method: sudo
ansible_become_user: root
ansible_become_password: "{{ vault_become_pw }}"

# Python interpreter
ansible_python_interpreter: /usr/bin/python3

# Connection type
ansible_connection: ssh            # Could also be: local, docker, winrm
```

## Variable Precedence

When the same variable is defined in multiple places, Ansible follows a strict precedence order. For host variables specifically, the precedence from lowest to highest is:

```mermaid
graph TB
    A["all group_vars (lowest)"] --> B["parent group_vars"]
    B --> C["child group_vars"]
    C --> D["host_vars files"]
    D --> E["inventory inline host vars"]
    E --> F["play vars"]
    F --> G["task vars"]
    G --> H["extra vars -e (highest)"]
```

A practical example of where this matters:

```yaml
# group_vars/webservers.yml
max_connections: 100

# host_vars/web1.example.com.yml
max_connections: 500
```

In this case, `web1.example.com` will use `max_connections: 500` because host_vars has higher precedence than group_vars.

## Using Host Variables in Playbooks

Once defined, host variables are available in templates and tasks using standard Jinja2 syntax.

```yaml
# deploy-webapp.yml
# Playbook that uses host-specific variables
- hosts: webservers
  become: true
  tasks:
    - name: Generate nginx config from host variables
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/sites-available/default
      notify: restart nginx

    - name: Set application worker count
      lineinfile:
        path: /etc/myapp/config.env
        regexp: "^WORKERS="
        line: "WORKERS={{ max_workers }}"

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

The corresponding template can reference any host variable:

```jinja2
# templates/nginx.conf.j2
# Nginx config using host-specific variables
server {
    listen {{ http_port }};
    server_name {{ inventory_hostname }};

    location / {
        proxy_pass http://127.0.0.1:{{ app_port | default(5000) }};
    }
}
```

## Debugging Host Variables

When things do not work as expected, inspect what variables a host actually receives:

```bash
# Show all variables for a specific host
ansible-inventory -i inventory.ini --host web1.example.com

# Or use the debug module in a playbook
ansible web1.example.com -i inventory.ini -m debug -a "var=hostvars[inventory_hostname]"
```

## Best Practices

1. **Keep inline variables minimal.** Use them only for connection parameters like `ansible_host`. Move everything else to `host_vars` files.

2. **Use vault for secrets.** Never put passwords or API keys in plain text. Reference vault-encrypted variables instead.

3. **Document your variables.** Add comments in your `host_vars` files explaining what each variable controls and what values are valid.

4. **Use group_vars for shared defaults.** Only put values in host_vars that genuinely differ between hosts. If all your web servers use the same nginx version, that belongs in `group_vars/webservers.yml`, not in every host_vars file.

Host variables are a fundamental building block of Ansible configuration. Getting them right means your playbooks stay clean and your per-host customizations stay organized, auditable, and easy to change.
