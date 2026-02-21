# How to Store Database Passwords in Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Database, Security, PostgreSQL, MySQL

Description: Learn how to securely store and use database passwords with Ansible Vault across PostgreSQL, MySQL, and other database systems.

---

Database credentials are among the most sensitive secrets in any infrastructure. A leaked database password can lead to data breaches, unauthorized access, and compliance violations. Ansible Vault provides a solid way to encrypt these credentials at rest while making them available to your automation when needed. This guide covers practical patterns for storing and using database passwords with Ansible Vault for PostgreSQL, MySQL, MongoDB, and other database systems.

## The Basic Pattern

The recommended approach is to store encrypted passwords in vault files and reference them through plaintext variable files:

```yaml
# group_vars/production/vault.yml (encrypted with ansible-vault)
---
vault_postgres_admin_password: "StrongP0stgresAdm!n"
vault_postgres_app_password: "AppUs3rP@ss2024"
vault_postgres_replication_password: "R3pl!c@t!onP@ss"
vault_mysql_root_password: "MySQL_R00t_Str0ng"
vault_mysql_app_password: "MySQL_App_P@ss"
```

```yaml
# group_vars/production/vars.yml (plaintext, references vault vars)
---
# PostgreSQL settings
postgres_admin_password: "{{ vault_postgres_admin_password }}"
postgres_app_password: "{{ vault_postgres_app_password }}"
postgres_replication_password: "{{ vault_postgres_replication_password }}"

# MySQL settings
mysql_root_password: "{{ vault_mysql_root_password }}"
mysql_app_password: "{{ vault_mysql_app_password }}"
```

## Creating the Encrypted Variables File

```bash
# Create the vault file with encrypted content
ansible-vault create group_vars/production/vault.yml
```

Or encrypt individual values inline:

```bash
# Encrypt each database password individually
echo -n 'StrongP0stgresAdm!n' | ansible-vault encrypt_string \
  --vault-password-file vault_pass.txt \
  --stdin-name 'vault_postgres_admin_password'

echo -n 'AppUs3rP@ss2024' | ansible-vault encrypt_string \
  --vault-password-file vault_pass.txt \
  --stdin-name 'vault_postgres_app_password'
```

## PostgreSQL Password Management

A complete playbook for managing PostgreSQL with vault-encrypted passwords:

```yaml
# roles/postgresql/tasks/main.yml
# Installs and configures PostgreSQL with vault-encrypted credentials
---
- name: Install PostgreSQL
  ansible.builtin.apt:
    name:
      - postgresql
      - postgresql-contrib
      - python3-psycopg2
    state: present

- name: Ensure PostgreSQL is running
  ansible.builtin.systemd:
    name: postgresql
    state: started
    enabled: true

- name: Set postgres admin password
  become: true
  become_user: postgres
  community.postgresql.postgresql_user:
    name: postgres
    password: "{{ postgres_admin_password }}"
    encrypted: true
  no_log: true

- name: Create application database
  become: true
  become_user: postgres
  community.postgresql.postgresql_db:
    name: "{{ app_db_name }}"
    encoding: UTF-8
    lc_collate: en_US.UTF-8
    lc_ctype: en_US.UTF-8

- name: Create application database user
  become: true
  become_user: postgres
  community.postgresql.postgresql_user:
    name: "{{ app_db_user }}"
    password: "{{ postgres_app_password }}"
    db: "{{ app_db_name }}"
    priv: "ALL"
    encrypted: true
  no_log: true

- name: Create replication user
  become: true
  become_user: postgres
  community.postgresql.postgresql_user:
    name: replicator
    password: "{{ postgres_replication_password }}"
    role_attr_flags: REPLICATION,LOGIN
    encrypted: true
  no_log: true

- name: Deploy pg_hba.conf
  ansible.builtin.template:
    src: pg_hba.conf.j2
    dest: "/etc/postgresql/{{ pg_version }}/main/pg_hba.conf"
    owner: postgres
    group: postgres
    mode: '0640'
  notify: reload postgresql
```

The `pg_hba.conf` template:

```jinja2
{# pg_hba.conf.j2 - PostgreSQL client authentication #}
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    {{ app_db_name }}  {{ app_db_user }}  {{ app_network }}  scram-sha-256
host    replication     replicator      {{ replica_network }}    scram-sha-256
```

## MySQL Password Management

```yaml
# roles/mysql/tasks/main.yml
# Installs and configures MySQL with vault-encrypted credentials
---
- name: Install MySQL
  ansible.builtin.apt:
    name:
      - mysql-server
      - python3-pymysql
    state: present

- name: Ensure MySQL is running
  ansible.builtin.systemd:
    name: mysql
    state: started
    enabled: true

- name: Set MySQL root password
  community.mysql.mysql_user:
    name: root
    host: localhost
    password: "{{ mysql_root_password }}"
    login_unix_socket: /var/run/mysqld/mysqld.sock
  no_log: true

- name: Deploy root .my.cnf for passwordless local access
  ansible.builtin.template:
    src: root_my.cnf.j2
    dest: /root/.my.cnf
    owner: root
    group: root
    mode: '0600'
  no_log: true

- name: Create application database
  community.mysql.mysql_db:
    name: "{{ app_db_name }}"
    state: present
    encoding: utf8mb4
    collation: utf8mb4_unicode_ci

- name: Create application database user
  community.mysql.mysql_user:
    name: "{{ app_db_user }}"
    host: "{{ app_db_host_allow }}"
    password: "{{ mysql_app_password }}"
    priv: "{{ app_db_name }}.*:ALL"
    state: present
  no_log: true
```

The root credentials file template:

```jinja2
{# root_my.cnf.j2 - MySQL root credentials for local access #}
[client]
user=root
password={{ mysql_root_password }}
socket=/var/run/mysqld/mysqld.sock
```

## MongoDB Password Management

```yaml
# roles/mongodb/tasks/main.yml
# Configures MongoDB with vault-encrypted admin and app credentials
---
- name: Create MongoDB admin user
  community.mongodb.mongodb_user:
    database: admin
    name: admin
    password: "{{ vault_mongo_admin_password }}"
    roles:
      - role: root
        db: admin
    login_host: localhost
    login_port: 27017
  no_log: true

- name: Create application MongoDB user
  community.mongodb.mongodb_user:
    database: "{{ app_db_name }}"
    name: "{{ app_db_user }}"
    password: "{{ vault_mongo_app_password }}"
    roles:
      - role: readWrite
        db: "{{ app_db_name }}"
    login_host: localhost
    login_port: 27017
    login_user: admin
    login_password: "{{ vault_mongo_admin_password }}"
  no_log: true
```

## Application Database Connection Strings

Deploy connection strings to applications using templates:

```yaml
# Task to deploy a database connection configuration
- name: Deploy database connection configuration
  ansible.builtin.template:
    src: database.yml.j2
    dest: "/opt/{{ app_name }}/config/database.yml"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
  no_log: true
  notify: restart application
```

```jinja2
{# database.yml.j2 - Application database configuration #}
production:
  adapter: postgresql
  host: {{ db_host }}
  port: {{ db_port | default(5432) }}
  database: {{ app_db_name }}
  username: {{ app_db_user }}
  password: {{ postgres_app_password }}
  pool: {{ db_pool_size | default(25) }}
  timeout: 5000
  encoding: unicode
  sslmode: {{ db_ssl_mode | default('require') }}
```

## Environment File Pattern

Many modern applications read database credentials from environment files:

```yaml
# Deploy a .env file with database credentials
- name: Deploy application environment file
  ansible.builtin.template:
    src: dotenv.j2
    dest: "/opt/{{ app_name }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
  no_log: true
```

```jinja2
{# dotenv.j2 #}
DATABASE_URL=postgresql://{{ app_db_user }}:{{ postgres_app_password }}@{{ db_host }}:{{ db_port }}/{{ app_db_name }}?sslmode=require
REDIS_URL=redis://:{{ vault_redis_password }}@{{ redis_host }}:6379/0
```

## Per-Environment Database Credentials

Structure credentials differently per environment:

```yaml
# group_vars/dev/vault.yml (encrypted)
vault_postgres_app_password: "dev-simple-password"
vault_mysql_root_password: "dev-root-pass"

# group_vars/staging/vault.yml (encrypted)
vault_postgres_app_password: "staging-stronger-password"
vault_mysql_root_password: "staging-root-stronger"

# group_vars/prod/vault.yml (encrypted)
vault_postgres_app_password: "production-very-strong-random-password"
vault_mysql_root_password: "production-root-very-strong-random"
```

## Password Generation with Vault

Generate strong random passwords and store them encrypted:

```yaml
# generate_db_passwords.yml
# Generates random passwords and creates a vault-encrypted file
---
- name: Generate database passwords
  hosts: localhost
  vars:
    vault_password: "{{ lookup('file', '~/.vault_pass.txt') }}"
  tasks:
    - name: Generate random passwords
      ansible.builtin.set_fact:
        new_passwords:
          vault_postgres_admin_password: "{{ lookup('password', '/dev/null length=32 chars=ascii_letters,digits,punctuation') }}"
          vault_postgres_app_password: "{{ lookup('password', '/dev/null length=24 chars=ascii_letters,digits') }}"
          vault_mysql_root_password: "{{ lookup('password', '/dev/null length=32 chars=ascii_letters,digits,punctuation') }}"

    - name: Write encrypted vault file
      ansible.builtin.copy:
        content: "{{ new_passwords | to_nice_yaml }}"
        dest: "{{ playbook_dir }}/group_vars/production/vault.yml"
        mode: '0644'
      no_log: true

    - name: Encrypt the vault file
      ansible.builtin.command:
        cmd: ansible-vault encrypt --vault-password-file ~/.vault_pass.txt group_vars/production/vault.yml
```

## The no_log Directive

Always use `no_log: true` on tasks that handle database passwords. Without it, Ansible prints the task parameters (including passwords) in the output:

```yaml
# BAD: password will appear in Ansible output
- name: Create database user
  community.postgresql.postgresql_user:
    name: app_user
    password: "{{ postgres_app_password }}"

# GOOD: password is hidden from output
- name: Create database user
  community.postgresql.postgresql_user:
    name: app_user
    password: "{{ postgres_app_password }}"
  no_log: true
```

## Summary

Storing database passwords in Ansible Vault follows a consistent pattern: encrypt the passwords in vault files, reference them through plaintext variable files, and use `no_log: true` on every task that handles them. The `vault_` prefix naming convention makes it clear which variables contain secrets. This approach works across PostgreSQL, MySQL, MongoDB, and any other database system that Ansible can manage, keeping your credentials encrypted at rest and available to automation when needed.
