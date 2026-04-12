# How to Automate MySQL Deployments with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Ansible, Automation, DevOps, Deployment

Description: Use Ansible to automate repeatable MySQL installations, configuration management, and schema deployments across your server fleet.

---

## Why Automate MySQL Deployments

Manual MySQL deployments are slow, error-prone, and impossible to audit. Ansible provides idempotent automation that installs, configures, and manages MySQL consistently across development, staging, and production environments. Once your playbooks are written and tested, deploying a new MySQL server takes minutes instead of hours.

## Prerequisites

Install Ansible and the community MySQL collection:

```bash
pip install ansible
ansible-galaxy collection install community.mysql
```

Create your inventory file:

```ini
# inventory/production.ini
[mysql_primary]
db-primary.prod.example.com ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/prod.pem

[mysql_replicas]
db-replica1.prod.example.com ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/prod.pem
db-replica2.prod.example.com ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/prod.pem

[mysql_servers:children]
mysql_primary
mysql_replicas
```

## Installing MySQL with a Playbook

Create a playbook to install and configure MySQL:

```yaml
# playbooks/mysql_install.yml
---
- name: Install and configure MySQL
  hosts: mysql_servers
  become: true
  vars:
    mysql_root_password: "{{ vault_mysql_root_password }}"
    mysql_bind_address: "0.0.0.0"
    mysql_max_connections: 300
    mysql_innodb_buffer_pool_size: "2G"

  tasks:
    - name: Install MySQL server
      apt:
        name:
          - mysql-server
          - python3-pymysql
        state: present
        update_cache: true

    - name: Start and enable MySQL
      service:
        name: mysql
        state: started
        enabled: true

    - name: Set MySQL root password
      community.mysql.mysql_user:
        name: root
        host_all: true
        password: "{{ mysql_root_password }}"
        login_unix_socket: /var/run/mysqld/mysqld.sock
        state: present

    - name: Deploy MySQL configuration
      template:
        src: templates/mysqld.cnf.j2
        dest: /etc/mysql/mysql.conf.d/mysqld.cnf
        owner: root
        group: root
        mode: '0644'
      notify: Restart MySQL

  handlers:
    - name: Restart MySQL
      service:
        name: mysql
        state: restarted
```

## Configuration Template

Create the Jinja2 template for `mysqld.cnf`:

```text
# templates/mysqld.cnf.j2
[mysqld]
bind-address            = {{ mysql_bind_address }}
max_connections         = {{ mysql_max_connections }}
innodb_buffer_pool_size = {{ mysql_innodb_buffer_pool_size }}
slow_query_log          = ON
slow_query_log_file     = /var/log/mysql/slow.log
long_query_time         = 1
log_error               = /var/log/mysql/error.log
```

## Creating Databases and Users

```yaml
# Add to the playbook tasks section
    - name: Create application database
      community.mysql.mysql_db:
        name: myapp
        state: present
        login_user: root
        login_password: "{{ mysql_root_password }}"

    - name: Create application user
      community.mysql.mysql_user:
        name: app_user
        host: "10.0.0.%"
        password: "{{ vault_app_db_password }}"
        priv: "myapp.*:SELECT,INSERT,UPDATE,DELETE"
        state: present
        login_user: root
        login_password: "{{ mysql_root_password }}"
```

## Running Schema Migrations

```yaml
    - name: Apply schema migrations
      community.mysql.mysql_query:
        login_user: root
        login_password: "{{ mysql_root_password }}"
        login_db: myapp
        query: "{{ lookup('file', item) }}"
      loop: "{{ query('fileglob', 'migrations/*.sql') | sort }}"
      when: run_migrations | default(false)
```

## Using Ansible Vault for Secrets

```bash
# Encrypt sensitive variables
ansible-vault encrypt_string 'SuperSecret123' --name 'vault_mysql_root_password'

# Run playbook with vault password
ansible-playbook -i inventory/production.ini playbooks/mysql_install.yml \
  --vault-password-file ~/.vault_pass \
  -e "run_migrations=true"
```

## Summary

Ansible makes MySQL deployments reproducible and auditable by codifying installation, configuration, and schema management in idempotent playbooks. Using the `community.mysql` collection, you can manage databases, users, and configuration templates, while Ansible Vault keeps secrets secure. The result is a consistent deployment process that works identically across all environments.
