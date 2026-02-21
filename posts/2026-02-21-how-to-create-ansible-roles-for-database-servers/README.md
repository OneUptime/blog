# How to Create Ansible Roles for Database Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Database, PostgreSQL, Roles, DevOps

Description: Build a production-ready Ansible role for database server provisioning including installation, configuration, user management, and backups.

---

Setting up database servers by hand is one of those things that seems fine until you have to do it for the fifth time. Or until someone asks why the staging database has different settings than production. An Ansible role for database provisioning eliminates that inconsistency and gives you repeatable, auditable infrastructure. This post walks through building a PostgreSQL role from scratch, covering installation, configuration tuning, user and database creation, backup scheduling, and security hardening.

## Role Directory Structure

Start by creating the full role skeleton:

```bash
# Create the role directory structure
ansible-galaxy role init --init-path roles/ postgresql
```

This generates:

```
roles/postgresql/
  defaults/main.yml
  files/
  handlers/main.yml
  meta/main.yml
  tasks/main.yml
  templates/
  tests/
  vars/main.yml
```

## Default Variables

Define all configurable parameters with sensible defaults:

```yaml
# roles/postgresql/defaults/main.yml
# PostgreSQL version and packages
pg_version: 16
pg_packages:
  - "postgresql-{{ pg_version }}"
  - "postgresql-client-{{ pg_version }}"
  - "postgresql-contrib-{{ pg_version }}"
  - python3-psycopg2

# Directories
pg_data_dir: "/var/lib/postgresql/{{ pg_version }}/main"
pg_config_dir: "/etc/postgresql/{{ pg_version }}/main"
pg_log_dir: "/var/log/postgresql"

# Connection settings
pg_listen_addresses: "localhost"
pg_port: 5432
pg_max_connections: 100

# Memory tuning (adjust based on available RAM)
pg_shared_buffers: "256MB"
pg_effective_cache_size: "768MB"
pg_work_mem: "4MB"
pg_maintenance_work_mem: "128MB"

# WAL settings
pg_wal_buffers: "16MB"
pg_min_wal_size: "1GB"
pg_max_wal_size: "4GB"
pg_checkpoint_completion_target: 0.9

# Query tuning
pg_random_page_cost: 1.1
pg_effective_io_concurrency: 200
pg_default_statistics_target: 100

# Logging
pg_log_statement: "ddl"
pg_log_min_duration_statement: 1000
pg_log_line_prefix: "%m [%p] %q%u@%d "

# Databases to create
pg_databases: []
# Example:
#   - name: myapp
#     encoding: UTF8
#     lc_collate: en_US.UTF-8
#     lc_ctype: en_US.UTF-8
#     owner: myapp_user

# Users to create
pg_users: []
# Example:
#   - name: myapp_user
#     password: "secure_password"
#     role_attr_flags: CREATEDB

# pg_hba entries
pg_hba_entries:
  - { type: local, database: all, user: postgres, method: peer }
  - { type: local, database: all, user: all, method: peer }
  - { type: host, database: all, user: all, address: "127.0.0.1/32", method: scram-sha-256 }
  - { type: host, database: all, user: all, address: "::1/128", method: scram-sha-256 }

# Backup settings
pg_backup_enabled: false
pg_backup_dir: "/var/backups/postgresql"
pg_backup_hour: 2
pg_backup_minute: 0
pg_backup_retention_days: 14
```

## Installation Tasks

```yaml
# roles/postgresql/tasks/main.yml
# Main entry point - orchestrates all sub-tasks
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include configuration tasks
  ansible.builtin.include_tasks: configure.yml

- name: Include database creation tasks
  ansible.builtin.include_tasks: databases.yml
  when: pg_databases | length > 0

- name: Include user management tasks
  ansible.builtin.include_tasks: users.yml
  when: pg_users | length > 0

- name: Include backup tasks
  ansible.builtin.include_tasks: backup.yml
  when: pg_backup_enabled
```

```yaml
# roles/postgresql/tasks/install.yml
# Install PostgreSQL from the official repository
- name: Install prerequisites
  ansible.builtin.apt:
    name:
      - gnupg2
      - lsb-release
      - apt-transport-https
      - ca-certificates
    state: present
    update_cache: yes

- name: Add PostgreSQL GPG key
  ansible.builtin.apt_key:
    url: https://www.postgresql.org/media/keys/ACCC4CF8.asc
    state: present

- name: Add PostgreSQL repository
  ansible.builtin.apt_repository:
    repo: "deb http://apt.postgresql.org/pub/repos/apt {{ ansible_distribution_release }}-pgdg main"
    state: present
    filename: pgdg

- name: Install PostgreSQL packages
  ansible.builtin.apt:
    name: "{{ pg_packages }}"
    state: present
    update_cache: yes

- name: Ensure PostgreSQL service is started
  ansible.builtin.systemd:
    name: postgresql
    state: started
    enabled: yes
```

## Configuration Tasks

```yaml
# roles/postgresql/tasks/configure.yml
# Apply PostgreSQL configuration and pg_hba.conf
- name: Deploy postgresql.conf
  ansible.builtin.template:
    src: postgresql.conf.j2
    dest: "{{ pg_config_dir }}/postgresql.conf"
    owner: postgres
    group: postgres
    mode: '0644'
  notify: restart postgresql

- name: Deploy pg_hba.conf
  ansible.builtin.template:
    src: pg_hba.conf.j2
    dest: "{{ pg_config_dir }}/pg_hba.conf"
    owner: postgres
    group: postgres
    mode: '0640'
  notify: reload postgresql

- name: Create log directory
  ansible.builtin.file:
    path: "{{ pg_log_dir }}"
    state: directory
    owner: postgres
    group: postgres
    mode: '0755'
```

## Configuration Templates

```jinja2
# roles/postgresql/templates/postgresql.conf.j2
# PostgreSQL configuration - managed by Ansible
# Do not edit manually

# Connection Settings
listen_addresses = '{{ pg_listen_addresses }}'
port = {{ pg_port }}
max_connections = {{ pg_max_connections }}

# Memory
shared_buffers = {{ pg_shared_buffers }}
effective_cache_size = {{ pg_effective_cache_size }}
work_mem = {{ pg_work_mem }}
maintenance_work_mem = {{ pg_maintenance_work_mem }}

# WAL
wal_buffers = {{ pg_wal_buffers }}
min_wal_size = {{ pg_min_wal_size }}
max_wal_size = {{ pg_max_wal_size }}
checkpoint_completion_target = {{ pg_checkpoint_completion_target }}

# Query Tuning
random_page_cost = {{ pg_random_page_cost }}
effective_io_concurrency = {{ pg_effective_io_concurrency }}
default_statistics_target = {{ pg_default_statistics_target }}

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '{{ pg_log_dir }}'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 0
log_statement = '{{ pg_log_statement }}'
log_min_duration_statement = {{ pg_log_min_duration_statement }}
log_line_prefix = '{{ pg_log_line_prefix }}'

# Data directory
data_directory = '{{ pg_data_dir }}'
```

```jinja2
# roles/postgresql/templates/pg_hba.conf.j2
# PostgreSQL Client Authentication Configuration
# Managed by Ansible - do not edit manually

# TYPE  DATABASE        USER            ADDRESS                 METHOD
{% for entry in pg_hba_entries %}
{{ entry.type }}	{{ entry.database }}	{{ entry.user }}	{{ entry.address | default('') }}	{{ entry.method }}
{% endfor %}
```

## Database and User Management Tasks

```yaml
# roles/postgresql/tasks/databases.yml
# Create databases defined in pg_databases
- name: Create databases
  community.postgresql.postgresql_db:
    name: "{{ item.name }}"
    encoding: "{{ item.encoding | default('UTF8') }}"
    lc_collate: "{{ item.lc_collate | default('en_US.UTF-8') }}"
    lc_ctype: "{{ item.lc_ctype | default('en_US.UTF-8') }}"
    owner: "{{ item.owner | default('postgres') }}"
    state: present
  become_user: postgres
  loop: "{{ pg_databases }}"
```

```yaml
# roles/postgresql/tasks/users.yml
# Create database users defined in pg_users
- name: Create database users
  community.postgresql.postgresql_user:
    name: "{{ item.name }}"
    password: "{{ item.password }}"
    role_attr_flags: "{{ item.role_attr_flags | default('') }}"
    state: present
  become_user: postgres
  loop: "{{ pg_users }}"
  no_log: true

- name: Grant database privileges
  community.postgresql.postgresql_privs:
    db: "{{ item.1 }}"
    role: "{{ item.0.name }}"
    type: database
    privs: ALL
    state: present
  become_user: postgres
  loop: "{{ pg_users | subelements('databases', skip_missing=True) }}"
  when: item.0.databases is defined
```

## Backup Tasks

```yaml
# roles/postgresql/tasks/backup.yml
# Set up automated PostgreSQL backups
- name: Create backup directory
  ansible.builtin.file:
    path: "{{ pg_backup_dir }}"
    state: directory
    owner: postgres
    group: postgres
    mode: '0750'

- name: Deploy backup script
  ansible.builtin.template:
    src: pg_backup.sh.j2
    dest: /usr/local/bin/pg_backup.sh
    owner: root
    group: root
    mode: '0755'

- name: Set up backup cron job
  ansible.builtin.cron:
    name: "PostgreSQL daily backup"
    user: postgres
    hour: "{{ pg_backup_hour }}"
    minute: "{{ pg_backup_minute }}"
    job: "/usr/local/bin/pg_backup.sh >> {{ pg_log_dir }}/backup.log 2>&1"
```

```bash
#!/bin/bash
# roles/postgresql/templates/pg_backup.sh.j2
# PostgreSQL backup script - managed by Ansible
# Runs pg_dumpall and cleans up old backups

BACKUP_DIR="{{ pg_backup_dir }}"
RETENTION_DAYS="{{ pg_backup_retention_days }}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting PostgreSQL backup at $(date)"

# Full cluster backup
pg_dumpall -U postgres | gzip > "${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql.gz"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully"
else
    echo "ERROR: Backup failed"
    exit 1
fi

# Clean up old backups
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "Cleaned up backups older than ${RETENTION_DAYS} days"
echo "Backup finished at $(date)"
```

## Handlers

```yaml
# roles/postgresql/handlers/main.yml
- name: restart postgresql
  ansible.builtin.systemd:
    name: postgresql
    state: restarted

- name: reload postgresql
  ansible.builtin.systemd:
    name: postgresql
    state: reloaded
```

## Using the Role

Here is a complete playbook example:

```yaml
# setup-database.yml
- hosts: database_servers
  become: yes
  roles:
    - role: postgresql
      vars:
        pg_version: 16
        pg_listen_addresses: "0.0.0.0"
        pg_max_connections: 200
        pg_shared_buffers: "2GB"
        pg_effective_cache_size: "6GB"
        pg_work_mem: "16MB"

        pg_databases:
          - name: app_production
            owner: app_user
          - name: app_analytics
            owner: analytics_user

        pg_users:
          - name: app_user
            password: "{{ vault_app_db_password }}"
            databases:
              - app_production
          - name: analytics_user
            password: "{{ vault_analytics_db_password }}"
            databases:
              - app_analytics
            role_attr_flags: "NOSUPERUSER,NOCREATEDB"

        pg_hba_entries:
          - { type: local, database: all, user: postgres, method: peer }
          - { type: host, database: app_production, user: app_user, address: "10.0.1.0/24", method: scram-sha-256 }
          - { type: host, database: app_analytics, user: analytics_user, address: "10.0.2.0/24", method: scram-sha-256 }

        pg_backup_enabled: true
        pg_backup_retention_days: 30
```

This role handles the full lifecycle of a PostgreSQL server. Start with these defaults, adjust the memory settings based on your hardware, and expand the pg_hba_entries to match your network layout. The modular task structure means you can also use `tasks_from` to run individual operations like just creating a new database or managing users without re-running the full role.
